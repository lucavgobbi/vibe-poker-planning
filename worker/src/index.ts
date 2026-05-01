import { DurableObject } from "cloudflare:workers";

type VoteValue = "0" | "1/2" | "1" | "2" | "3" | "5" | "8" | "13" | "21" | "34" | "55" | "89";

type ThrowEmoji =
  | "🔥"
  | "💥"
  | "🫡"
  | "😂"
  | "🚀"
  | "🍅"
  | "🧠"
  | "👀"
  | "🧻"
  | "🛩️"
  | "💩"
  | "🎯"
  | "⚡"
  | "🌈"
  | "⭐"
  | "🍕"
  | "🍿"
  | "🎉"
  | "🦆"
  | "🐢"
  | "🦖"
  | "🧊"
  | "🍌"
  | "🥨"
  | "🫠"
  | "🤯"
  | "🥳"
  | "👻"
  | "🧨"
  | "🎈"
  | "💫"
  | "🪩"
  | "🍩"
  | "🥔"
  | "🧷"
  | "🧲";

type RoomUser = {
  id: string;
  name: string;
  vote: VoteValue | null;
};

type ClientRecord = {
  socket: WebSocket;
  name: string;
};

type PlanningRoomState = {
  revealed: boolean;
  users: Map<string, RoomUser>;
};

type VoteMessage = {
  type: "vote";
  value: VoteValue;
};

type ThrowMessage = {
  type: "throw";
  targetUserId: string;
  emoji: ThrowEmoji;
};

type RevealMessage = {
  type: "reveal";
};

type ResetMessage = {
  type: "reset";
};

type ClientMessage = VoteMessage | ThrowMessage | RevealMessage | ResetMessage;

type ServerErrorPayload = {
  type: "error";
  message: string;
};

type ServerThrowPayload = {
  type: "throw";
  id: string;
  emoji: ThrowEmoji;
  fromUserId: string;
  fromUserName: string;
  targetUserId: string;
  targetUserName: string;
  sentAt: number;
};

type ServerStatePayload = {
  type: "state";
  revealed: boolean;
  users: Array<{
    id: string;
    name: string;
    vote: VoteValue | null;
    hasVoted: boolean;
  }>;
};

type ServerPayload = ServerErrorPayload | ServerThrowPayload | ServerStatePayload;

type Env = {
  ROOMS: DurableObjectNamespace<PlanningRoom>;
};

const ALLOWED_VOTES = new Set<VoteValue>(["0", "1/2", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89"]);
const ALLOWED_THROW_EMOJIS = new Set<ThrowEmoji>([
  "🔥",
  "💥",
  "🫡",
  "😂",
  "🚀",
  "🍅",
  "🧠",
  "👀",
  "🧻",
  "🛩️",
  "💩",
  "🎯",
  "⚡",
  "🌈",
  "⭐",
  "🍕",
  "🍿",
  "🎉",
  "🦆",
  "🐢",
  "🦖",
  "🧊",
  "🍌",
  "🥨",
  "🫠",
  "🤯",
  "🥳",
  "👻",
  "🧨",
  "🎈",
  "💫",
  "🪩",
  "🍩",
  "🥔",
  "🧷",
  "🧲",
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: {
          "content-type": "application/json",
        },
      });
    }

    if (!url.pathname.startsWith("/connect/")) {
      return new Response("Not found", { status: 404 });
    }

    const roomId = decodeURIComponent(url.pathname.replace("/connect/", "")).trim().toLowerCase();
    if (!roomId) {
      return jsonError("Missing room id.", 400);
    }

    const roomObjectId = env.ROOMS.idFromName(roomId);
    const room = env.ROOMS.get(roomObjectId);
    return room.fetch(request);
  },
} satisfies ExportedHandler<Env>;

export class PlanningRoom extends DurableObject<Env> {
  private clients = new Map<string, ClientRecord>();
  private room: PlanningRoomState = {
    revealed: false,
    users: new Map(),
  };

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return jsonError("Expected websocket upgrade.", 426);
    }

    const url = new URL(request.url);
    const name = sanitizeName(url.searchParams.get("name"));
    const clientId = sanitizeClientId(url.searchParams.get("clientId"));

    if (!name || !clientId) {
      return jsonError("Missing or invalid name/client id.", 400);
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.attachClient(server, {
      clientId,
      name,
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private attachClient(socket: WebSocket, identity: { clientId: string; name: string }) {
    const existingClient = this.clients.get(identity.clientId);
    if (existingClient) {
      existingClient.socket.close(1012, "Reconnected");
    }

    const previous = this.room.users.get(identity.clientId);
    const nextUser: RoomUser = {
      id: identity.clientId,
      name: identity.name,
      vote: previous?.vote ?? null,
    };

    this.room.users.set(identity.clientId, nextUser);
    this.clients.set(identity.clientId, {
      socket,
      name: identity.name,
    });
    this.ctx.acceptWebSocket(socket, [identity.clientId]);

    this.broadcastState();
  }

  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
    const clientId = this.getClientIdForSocket(ws);
    if (!clientId) {
      return;
    }

    let payload: ClientMessage;

    try {
      payload = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message)) as ClientMessage;
    } catch {
      this.sendToClient(clientId, {
        type: "error",
        message: "Invalid message payload.",
      });
      return;
    }

    switch (payload.type) {
      case "vote":
        this.updateVote(clientId, payload.value);
        return;
      case "throw":
        this.throwEmoji(clientId, payload.targetUserId, payload.emoji);
        return;
      case "reveal":
        this.room.revealed = true;
        this.broadcastState();
        return;
      case "reset":
        this.room.revealed = false;
        for (const user of this.room.users.values()) {
          user.vote = null;
        }
        this.broadcastState();
        return;
      default:
        this.sendToClient(clientId, {
          type: "error",
          message: "Unsupported event type.",
        });
    }
  }

  webSocketClose(ws: WebSocket): void {
    const clientId = this.getClientIdForSocket(ws);
    if (clientId) {
      this.detachClient(clientId, ws);
    }
  }

  webSocketError(ws: WebSocket): void {
    const clientId = this.getClientIdForSocket(ws);
    if (clientId) {
      this.detachClient(clientId, ws);
    }
  }

  private updateVote(clientId: string, vote: VoteValue) {
    if (!ALLOWED_VOTES.has(vote)) {
      this.sendToClient(clientId, {
        type: "error",
        message: "Unsupported vote.",
      });
      return;
    }

    const user = this.room.users.get(clientId);
    if (!user) {
      return;
    }

    user.vote = vote;
    this.broadcastState();
  }

  private throwEmoji(fromUserId: string, targetUserId: string, emoji: ThrowEmoji) {
    if (!ALLOWED_THROW_EMOJIS.has(emoji)) {
      this.sendToClient(fromUserId, {
        type: "error",
        message: "Unsupported emoji.",
      });
      return;
    }

    const fromUser = this.room.users.get(fromUserId);
    const targetUser = this.room.users.get(targetUserId);
    if (!fromUser || !targetUser) {
      this.sendToClient(fromUserId, {
        type: "error",
        message: "Target user is no longer in the room.",
      });
      return;
    }

    this.broadcast({
      type: "throw",
      id: crypto.randomUUID(),
      emoji,
      fromUserId,
      fromUserName: fromUser.name,
      targetUserId,
      targetUserName: targetUser.name,
      sentAt: Date.now(),
    });
  }

  private detachClient(clientId: string, socket: WebSocket) {
    const current = this.clients.get(clientId);
    if (!current || current.socket !== socket) {
      return;
    }

    this.clients.delete(clientId);
    this.room.users.delete(clientId);
    this.broadcastState();
  }

  private getClientIdForSocket(socket: WebSocket): string | null {
    const [clientId] = this.ctx.getTags(socket);
    return clientId ?? null;
  }

  private sendToClient(clientId: string, payload: ServerErrorPayload) {
    const current = this.clients.get(clientId);
    if (!current) {
      return;
    }

    try {
      current.socket.send(JSON.stringify(payload));
    } catch {}
  }

  private broadcastState() {
    this.broadcast({
      type: "state",
      revealed: this.room.revealed,
      users: Array.from(this.room.users.values())
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((user) => ({
          id: user.id,
          name: user.name,
          vote: this.room.revealed ? user.vote : null,
          hasVoted: Boolean(user.vote),
        })),
    });
  }

  private broadcast(payload: ServerPayload) {
    const message = JSON.stringify(payload);
    for (const [clientId, client] of this.clients.entries()) {
      try {
        client.socket.send(message);
      } catch {
        this.clients.delete(clientId);
        this.room.users.delete(clientId);
      }
    }
  }
}

function sanitizeName(value: string | null): string {
  if (!value) {
    return "";
  }

  return value.trim().slice(0, 40);
}

function sanitizeClientId(value: string | null): string {
  if (!value) {
    return "";
  }

  return value.trim().slice(0, 80);
}

function jsonError(message: string, status: number): Response {
  return new Response(
    JSON.stringify({
      type: "error",
      message,
    } satisfies ServerErrorPayload),
    {
      status,
      headers: {
        "content-type": "application/json",
      },
    },
  );
}
