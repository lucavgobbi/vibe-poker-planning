const ALLOWED_VOTES = new Set(["0", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89"]);
const ALLOWED_THROW_EMOJIS = new Set(["🔥", "💥", "🫡", "😂", "🚀", "🍅", "🧠", "👀"]);

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
};

export class PlanningRoom {
  constructor(state) {
    this.state = state;
    this.clients = new Map();
    this.room = {
      revealed: false,
      users: new Map(),
    };
  }

  async fetch(request) {
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
    server.accept();

    this.attachClient(server, {
      clientId,
      name,
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  attachClient(socket, identity) {
    const existingClient = this.clients.get(identity.clientId);
    if (existingClient) {
      existingClient.socket.close(1012, "Reconnected");
    }

    const previous = this.room.users.get(identity.clientId);
    const nextUser = {
      id: identity.clientId,
      name: identity.name,
      vote: previous?.vote ?? null,
    };

    this.room.users.set(identity.clientId, nextUser);
    this.clients.set(identity.clientId, {
      socket,
      name: identity.name,
    });

    socket.addEventListener("message", (event) => {
      this.onMessage(identity.clientId, event);
    });

    socket.addEventListener("close", () => {
      this.detachClient(identity.clientId, socket);
    });

    socket.addEventListener("error", () => {
      this.detachClient(identity.clientId, socket);
    });

    this.broadcastState();
  }

  onMessage(clientId, event) {
    let payload;

    try {
      payload = JSON.parse(event.data);
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

  updateVote(clientId, vote) {
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

  throwEmoji(fromUserId, targetUserId, emoji) {
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

  detachClient(clientId, socket) {
    const current = this.clients.get(clientId);
    if (!current || current.socket !== socket) {
      return;
    }

    this.clients.delete(clientId);
    this.room.users.delete(clientId);
    this.broadcastState();
  }

  sendToClient(clientId, payload) {
    const current = this.clients.get(clientId);
    if (!current) {
      return;
    }

    try {
      current.socket.send(JSON.stringify(payload));
    } catch {}
  }

  broadcastState() {
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

  broadcast(payload) {
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

function sanitizeName(value) {
  if (!value) {
    return "";
  }

  return value.trim().slice(0, 40);
}

function sanitizeClientId(value) {
  if (!value) {
    return "";
  }

  return value.trim().slice(0, 80);
}

function jsonError(message, status) {
  return new Response(
    JSON.stringify({
      type: "error",
      message,
    }),
    {
      status,
      headers: {
        "content-type": "application/json",
      },
    },
  );
}
