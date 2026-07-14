import { DurableObject } from "cloudflare:workers";

type DeckType = "fibonacci" | "base2" | "regular";

type VoteValue =
  | "0" | "1/2" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | "10" | "11" | "12" | "13" | "16" | "21" | "32" | "34" | "55" | "64" | "89" | "128";

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
  isSpectator: boolean;
};

type ClientRecord = {
  socket: WebSocket;
  name: string;
};

type PlanningRoomState = {
  revealed: boolean;
  deck: DeckType | null;
  users: Map<string, RoomUser>;
};

/** Persisted on each WebSocket for hibernation-safe rebuild (client id stays in socket tags). */
type SocketAttachment = {
  name: string;
  vote: VoteValue | null;
  isSpectator: boolean;
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
  deck: DeckType;
  users: Array<{
    id: string;
    name: string;
    vote: VoteValue | null;
    hasVoted: boolean;
    isSpectator: boolean;
  }>;
};

type ServerPayload = ServerErrorPayload | ServerThrowPayload | ServerStatePayload;

type Env = {
  ROOMS: DurableObjectNamespace<PlanningRoom>;
};

const STORAGE_KEY_REVEALED = "revealed";
const STORAGE_KEY_DECK = "deck";

const DEFAULT_DECK: DeckType = "fibonacci";

const DECK_VALUES: Record<DeckType, readonly string[]> = {
  fibonacci: ["0", "1/2", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89"],
  base2: ["0", "1", "2", "4", "8", "16", "32", "64", "128"],
  regular: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
};

const ALLOWED_VOTES = new Set(Object.values(DECK_VALUES).flat());
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
    deck: null,
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
    const spectator = url.searchParams.get("spectator") === "true";

    if (!name || !clientId) {
      return jsonError("Missing or invalid name/client id.", 400);
    }

    await this.hydrateRoom();

    if (!this.room.deck) {
      this.room.deck = sanitizeDeck(url.searchParams.get("deck")) ?? DEFAULT_DECK;
      await this.persistDeck(this.room.deck);
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.attachClient(server, {
      clientId,
      name,
      spectator,
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private attachClient(
    socket: WebSocket,
    identity: { clientId: string; name: string; spectator: boolean },
  ) {
    const existingClient = this.clients.get(identity.clientId);
    if (existingClient) {
      existingClient.socket.close(1012, "Reconnected");
    }

    const previous = this.room.users.get(identity.clientId);
    const nextUser: RoomUser = {
      id: identity.clientId,
      name: identity.name,
      vote: previous?.vote ?? null,
      isSpectator: identity.spectator,
    };

    this.room.users.set(identity.clientId, nextUser);
    this.clients.set(identity.clientId, {
      socket,
      name: identity.name,
    });
    this.ctx.acceptWebSocket(socket, [identity.clientId]);
    this.persistSocketAttachment(identity.clientId);

    this.broadcastState();
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    await this.hydrateRoom();

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
        await this.persistRevealed(true);
        this.broadcastState();
        return;
      case "reset":
        await this.persistRevealed(false);
        for (const user of this.room.users.values()) {
          user.vote = null;
        }
        for (const id of this.room.users.keys()) {
          this.persistSocketAttachment(id);
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

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.hydrateRoom();

    const clientId = this.getClientIdForSocket(ws);
    if (clientId) {
      this.detachClient(clientId, ws);
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.hydrateRoom();

    const clientId = this.getClientIdForSocket(ws);
    if (clientId) {
      this.detachClient(clientId, ws);
    }
  }

  private updateVote(clientId: string, vote: VoteValue) {
    const user = this.room.users.get(clientId);
    if (!user) {
      return;
    }

    if (user.isSpectator) {
      this.sendToClient(clientId, {
        type: "error",
        message: "Spectators cannot vote.",
      });
      return;
    }

    const deck = this.room.deck ?? DEFAULT_DECK;
    const allowedForDeck = new Set(DECK_VALUES[deck]);
    if (!allowedForDeck.has(vote)) {
      this.sendToClient(clientId, {
        type: "error",
        message: "Unsupported vote.",
      });
      return;
    }

    user.vote = vote;
    this.persistSocketAttachment(clientId);
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

  private async detachClient(clientId: string, socket: WebSocket) {
    const current = this.clients.get(clientId);
    if (!current || current.socket !== socket) {
      return;
    }

    this.removeClientRecords(clientId);

    if (this.clients.size === 0) {
      await this.persistRevealed(false);
    }

    this.broadcastState();
  }

  /**
   * Removes a participant without sending updates. Used when pruning dead sockets during broadcast.
   */
  private removeClientRecords(clientId: string) {
    this.clients.delete(clientId);
    this.room.users.delete(clientId);
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
    } catch {
      // Ignore transient send failures; roster sync happens on the next successful broadcastState.
    }
  }

  private broadcastState() {
    this.broadcast({
      type: "state",
      revealed: this.room.revealed,
      deck: this.room.deck ?? DEFAULT_DECK,
      users: Array.from(this.room.users.values())
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((user) => ({
          id: user.id,
          name: user.name,
          vote: this.room.revealed ? user.vote : null,
          hasVoted: Boolean(user.vote),
          isSpectator: user.isSpectator,
        })),
    });
  }

  private broadcast(payload: ServerPayload) {
    const message = JSON.stringify(payload);
    const disconnected: string[] = [];

    for (const [clientId, client] of this.clients.entries()) {
      try {
        client.socket.send(message);
      } catch {
        disconnected.push(clientId);
      }
    }

    if (disconnected.length === 0) {
      return;
    }

    for (const clientId of disconnected) {
      const record = this.clients.get(clientId);
      if (record) {
        this.removeClientRecords(clientId);
      }
    }

    if (this.clients.size === 0) {
      void this.persistRevealed(false);
    }

    if (payload.type !== "state") {
      this.broadcastState();
      return;
    }

    // State broadcast had failures: send one fresh roster update without nesting payload-specific logic.
    if (this.clients.size === 0) {
      return;
    }

    const sync = JSON.stringify({
      type: "state",
      revealed: this.room.revealed,
      deck: this.room.deck ?? DEFAULT_DECK,
      users: Array.from(this.room.users.values())
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((user) => ({
          id: user.id,
          name: user.name,
           vote: this.room.revealed ? user.vote : null,
          hasVoted: Boolean(user.vote),
          isSpectator: user.isSpectator,
        })),
    } satisfies ServerStatePayload);

    for (const [clientId, client] of this.clients.entries()) {
      try {
        client.socket.send(sync);
      } catch {
        this.removeClientRecords(clientId);
      }
    }

    if (this.clients.size === 0) {
      void this.persistRevealed(false);
    }
  }

  /**
   * Rebuild in-memory maps after WebSocket hibernation (heap was cleared; sockets and attachments remain).
   */
  private async hydrateRoom(): Promise<void> {
    const [storedRevealed, storedDeck] = await Promise.all([
      this.ctx.storage.get<boolean>(STORAGE_KEY_REVEALED),
      this.ctx.storage.get<DeckType>(STORAGE_KEY_DECK),
    ]);
    this.room.revealed = storedRevealed ?? false;
    this.room.deck = storedDeck ?? null;

    this.clients.clear();
    this.room.users.clear();

    for (const ws of this.ctx.getWebSockets()) {
      const clientId = this.ctx.getTags(ws)[0];
      if (!clientId) {
        continue;
      }

      const attachment = this.readAttachment(ws);
      if (!attachment || !attachment.name) {
        continue;
      }

      this.clients.set(clientId, { socket: ws, name: attachment.name });
      this.room.users.set(clientId, {
        id: clientId,
        name: attachment.name,
        vote: attachment.vote,
        isSpectator: attachment.isSpectator,
      });
    }
  }

  private readAttachment(ws: WebSocket): SocketAttachment | null {
    const raw = ws.deserializeAttachment?.();
    if (raw == null || typeof raw !== "string") {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<SocketAttachment>;
      const name = typeof parsed.name === "string" ? parsed.name.trim().slice(0, 40) : "";
      const voteRaw = parsed.vote;
      const isSpectator = parsed.isSpectator === true;

      let vote: VoteValue | null = null;
      if (voteRaw !== undefined && voteRaw !== null) {
        if (ALLOWED_VOTES.has(voteRaw as VoteValue)) {
          vote = voteRaw as VoteValue;
        }
      }

      return { name, vote, isSpectator };
    } catch {
      return null;
    }
  }

  private persistSocketAttachment(clientId: string): void {
    const client = this.clients.get(clientId);
    const user = this.room.users.get(clientId);
    if (!client || !user) {
      return;
    }

    const payload: SocketAttachment = {
      name: user.name,
      vote: user.vote,
      isSpectator: user.isSpectator,
    };

    client.socket.serializeAttachment(JSON.stringify(payload));
  }

  private async persistRevealed(revealed: boolean): Promise<void> {
    this.room.revealed = revealed;
    await this.ctx.storage.put(STORAGE_KEY_REVEALED, revealed);
  }

  private async persistDeck(deck: DeckType): Promise<void> {
    await this.ctx.storage.put(STORAGE_KEY_DECK, deck);
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

function sanitizeDeck(value: string | null): DeckType | null {
  if (!value) {
    return null;
  }

  if (value === "fibonacci" || value === "base2" || value === "regular") {
    return value;
  }

  return null;
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
