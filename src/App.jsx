import { useEffect, useMemo, useRef, useState } from "react";

const VOTE_OPTIONS = ["0", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89"];
const THROW_EMOJIS = ["🔥", "💥", "🫡", "😂", "🚀", "🍅", "🧠", "👀"];
const CLIENT_ID_KEY = "planning-poker-client-id";
const DISPLAY_NAME_KEY = "planning-poker-display-name";
const THEME_KEY = "planning-poker-theme";

function createSlug() {
  return `room-${Math.random().toString(36).slice(2, 8)}`;
}

function getRoomIdFromPath() {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
  return path || "";
}

function getStoredClientId() {
  const existing = window.localStorage.getItem(CLIENT_ID_KEY);
  if (existing) {
    return existing;
  }

  const created = crypto.randomUUID();
  window.localStorage.setItem(CLIENT_ID_KEY, created);
  return created;
}

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialTheme() {
  return window.localStorage.getItem(THEME_KEY) || getSystemTheme();
}

function inferSocketBaseUrl() {
  if (import.meta.env.VITE_WS_BASE_URL) {
    return import.meta.env.VITE_WS_BASE_URL;
  }

  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "ws://127.0.0.1:8787";
  }

  return "";
}

function getSocketUrl(roomId, name, clientId) {
  const baseUrl = inferSocketBaseUrl();
  if (!baseUrl) {
    return "";
  }

  const normalized = baseUrl.replace(/\/$/, "");
  const params = new URLSearchParams({
    name,
    clientId,
  });

  return `${normalized}/connect/${encodeURIComponent(roomId)}?${params.toString()}`;
}

function useRoomSocket({ roomId, joinedName, enabled, clientId }) {
  const [connectionState, setConnectionState] = useState("idle");
  const [roomState, setRoomState] = useState({
    revealed: false,
    users: [],
  });
  const [throwEvents, setThrowEvents] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const shouldReconnectRef = useRef(false);

  useEffect(() => {
    if (!enabled || !roomId) {
      setConnectionState("idle");
      setErrorMessage("");
      setRoomState({
        revealed: false,
        users: [],
      });
      setThrowEvents([]);
      return undefined;
    }

    const socketUrl = getSocketUrl(roomId, joinedName, clientId);
    if (!socketUrl) {
      setConnectionState("error");
      setErrorMessage("Realtime backend is not configured. Set VITE_WS_BASE_URL before deploying the frontend.");
      return undefined;
    }

    shouldReconnectRef.current = true;

    const connect = () => {
      setConnectionState("connecting");
      const socket = new WebSocket(socketUrl);
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        setConnectionState("connected");
        setErrorMessage("");
      });

      socket.addEventListener("message", (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "state") {
            setRoomState({
              revealed: Boolean(payload.revealed),
              users: Array.isArray(payload.users) ? payload.users : [],
            });
          }
          if (payload.type === "error") {
            setErrorMessage(payload.message || "Unexpected server error.");
          }
          if (payload.type === "throw") {
            setThrowEvents((current) => [...current, payload]);
          }
        } catch {
          setErrorMessage("Received an invalid update from the server.");
        }
      });

      socket.addEventListener("close", () => {
        socketRef.current = null;
        if (!shouldReconnectRef.current) {
          setConnectionState("idle");
          return;
        }

        setConnectionState("reconnecting");
        reconnectTimerRef.current = window.setTimeout(connect, 1500);
      });

      socket.addEventListener("error", () => {
        setErrorMessage("Connection failed. Retrying...");
      });
    };

    connect();

    return () => {
      shouldReconnectRef.current = false;
      window.clearTimeout(reconnectTimerRef.current);
      if (socketRef.current) {
        socketRef.current.close(1000, "Leaving room");
      }
    };
  }, [clientId, enabled, joinedName, roomId]);

  useEffect(() => {
    if (throwEvents.length === 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      const cutoff = Date.now() - 2200;
      setThrowEvents((current) =>
        current.filter((event) => (event.sentAt || 0) > cutoff),
      );
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [throwEvents]);

  const sendMessage = (message) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    socket.send(JSON.stringify(message));
    return true;
  };

  return {
    connectionState,
    errorMessage,
    roomState,
    throwEvents,
    sendMessage,
  };
}

function JoinGate({ roomId, initialName, onJoin, onBack }) {
  const [name, setName] = useState(initialName);

  return (
    <div className="join-shell">
      <div className="join-card glass-card">
        <span className="eyebrow">Room {roomId}</span>
        <h1>Join the planning table</h1>
        <p>
          Everyone on this URL lands in the same room. Pick the name the rest of
          the team should see before you connect.
        </p>
        <label className="field">
          <span>Your name</span>
          <input
            autoFocus
            maxLength={40}
            placeholder="Ada Lovelace"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && name.trim()) {
                onJoin(name.trim());
              }
            }}
          />
        </label>
        <div className="join-actions">
          <button className="ghost-button" type="button" onClick={onBack}>
            Change room
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={!name.trim()}
            onClick={() => onJoin(name.trim())}
          >
            Join room
          </button>
        </div>
      </div>
    </div>
  );
}

function LandingPage() {
  const [customRoom, setCustomRoom] = useState("");

  const goToRoom = (roomId) => {
    const nextRoom = roomId.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (!nextRoom) {
      return;
    }

    window.location.assign(`/${nextRoom}`);
  };

  return (
    <div className="landing-page">
      <section className="hero glass-card">
        <div className="hero-copy">
          <span className="eyebrow">Realtime planning poker</span>
          <h1>Fast room links, instant votes, no account ceremony.</h1>
          <p>
            Share a URL, have everyone join with a name, vote on Fibonacci cards,
            then reveal together. Same path, same room.
          </p>
          <div className="hero-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => goToRoom(createSlug())}
            >
              Create room
            </button>
            <div className="inline-form">
              <input
                placeholder="Enter a custom room slug"
                value={customRoom}
                onChange={(event) => setCustomRoom(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    goToRoom(customRoom);
                  }
                }}
              />
              <button
                className="secondary-button"
                type="button"
                onClick={() => goToRoom(customRoom)}
              >
                Join URL
              </button>
            </div>
          </div>
        </div>
        <div className="hero-stage">
          {VOTE_OPTIONS.slice(0, 6).map((vote, index) => (
            <div
              key={vote}
              className="floating-card"
              style={{ "--card-index": index }}
            >
              {vote}
            </div>
          ))}
        </div>
      </section>

      <section className="feature-grid">
        <article className="glass-card feature-card">
          <h2>Room URLs</h2>
          <p>Use any path as a room. Hand the link around and everyone lands together.</p>
        </article>
        <article className="glass-card feature-card">
          <h2>Reveal together</h2>
          <p>Votes stay hidden until the team decides to flip the table.</p>
        </article>
        <article className="glass-card feature-card">
          <h2>Dark mode ready</h2>
          <p>Built with a full light and dark palette instead of a single swapped background.</p>
        </article>
      </section>
    </div>
  );
}

function App() {
  const [roomId, setRoomId] = useState(getRoomIdFromPath());
  const [joinedName, setJoinedName] = useState("");
  const [theme, setTheme] = useState(getInitialTheme());
  const clientId = useMemo(getStoredClientId, []);

  useEffect(() => {
    const storedName = window.localStorage.getItem(DISPLAY_NAME_KEY);
    if (storedName) {
      setJoinedName(storedName);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const handlePopState = () => {
      setRoomId(getRoomIdFromPath());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const { errorMessage, roomState, throwEvents, sendMessage } = useRoomSocket({
    roomId,
    joinedName,
    enabled: Boolean(roomId && joinedName),
    clientId,
  });
  const participantPanelRef = useRef(null);
  const participantRefs = useRef(new Map());
  const [emojiMenuUserId, setEmojiMenuUserId] = useState("");

  const currentUser = roomState.users.find((user) => user.id === clientId);
  const currentVote = currentUser?.vote ?? null;
  const revealed = roomState.revealed;
  const shareUrl = roomId ? `${window.location.origin}/${roomId}` : window.location.origin;
  const activeThrows = useMemo(
    () =>
      buildThrowVisuals({
        throwEvents,
        participantPanelRef,
        participantRefs,
      }),
    [throwEvents],
  );

  useEffect(() => {
    if (emojiMenuUserId && !roomState.users.some((user) => user.id === emojiMenuUserId)) {
      setEmojiMenuUserId("");
    }
  }, [emojiMenuUserId, roomState.users]);

  const handleJoin = (name) => {
    window.localStorage.setItem(DISPLAY_NAME_KEY, name);
    setJoinedName(name);
  };

  const handleLeaveRoom = () => {
    setJoinedName("");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      window.prompt("Copy room URL", shareUrl);
    }
  };

  const handleToggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const handleReturnHome = () => {
    window.location.assign("/");
  };

  const handleThrowEmoji = (targetUserId, emoji) => {
    sendMessage({
      type: "throw",
      targetUserId,
      emoji,
    });
    setEmojiMenuUserId("");
  };

  const setParticipantRef = (userId, node) => {
    if (node) {
      participantRefs.current.set(userId, node);
      return;
    }

    participantRefs.current.delete(userId);
  };

  if (!roomId) {
    return (
      <div className="app-shell">
        <Header
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
        <LandingPage />
      </div>
    );
  }

  if (!joinedName) {
    return (
      <div className="app-shell">
        <Header
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
        <JoinGate
          roomId={roomId}
          initialName={window.localStorage.getItem(DISPLAY_NAME_KEY) || ""}
          onJoin={handleJoin}
          onBack={handleReturnHome}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Header
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      <main className="room-layout">
        <section className="room-hero glass-card">
          <div>
            <span className="eyebrow">Room {roomId}</span>
            <h1>Planning Poker</h1>
            <p>
              Share the link, have everyone vote, then reveal when the table is ready.
            </p>
          </div>
          <div className="hero-meta">
            <button className="secondary-button" type="button" onClick={handleCopyLink}>
              Copy room URL
            </button>
            <button className="ghost-button" type="button" onClick={handleLeaveRoom}>
              Change name
            </button>
          </div>
          {errorMessage ? (
            <p className="room-error">Connection issue: {errorMessage}</p>
          ) : null}
        </section>

        <section className="main-grid">
          <div className="glass-card panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Voting</span>
                <h2>Pick a Fibonacci card</h2>
              </div>
              <div className="panel-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => sendMessage({ type: "reveal" })}
                >
                  Reveal
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => sendMessage({ type: "reset" })}
                >
                  Reset
                </button>
              </div>
            </div>
            <div className="vote-grid">
              {VOTE_OPTIONS.map((vote) => (
                <button
                  key={vote}
                  type="button"
                  className={`vote-card ${currentVote === vote ? "selected" : ""}`}
                  onClick={() => sendMessage({ type: "vote", value: vote })}
                >
                  {vote}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card panel participant-panel" ref={participantPanelRef}>
            <div className="panel-header">
              <div>
                <span className="eyebrow">Participants</span>
                <h2>Room table</h2>
              </div>
              <p className="panel-note">
                {currentVote ? `Your card: ${currentVote}` : "Pick a card to vote."}
              </p>
            </div>
            <div className="emoji-throw-layer" aria-hidden="true">
              {activeThrows.map((event) => (
                <span
                  key={event.id}
                  className="emoji-throw"
                  style={{
                    "--throw-start-x": `${event.startX}px`,
                    "--throw-start-y": `${event.startY}px`,
                    "--throw-end-x": `${event.endX}px`,
                    "--throw-end-y": `${event.endY}px`,
                  }}
                  title={`${event.fromUserName} threw ${event.emoji} at ${event.targetUserName}`}
                >
                  {event.emoji}
                </span>
              ))}
            </div>
            <div className="participant-list">
              {roomState.users.map((user) => (
                <article
                  className="participant-row"
                  key={user.id}
                  ref={(node) => setParticipantRef(user.id, node)}
                >
                  <div>
                    <button
                      className="participant-name"
                      type="button"
                      onClick={() =>
                        setEmojiMenuUserId((current) => (current === user.id ? "" : user.id))
                      }
                    >
                      <strong>{user.name}</strong>
                    </button>
                    <p>{user.id === clientId ? "You" : "Participant"}</p>
                    {emojiMenuUserId === user.id ? (
                      <div className="emoji-picker">
                        {THROW_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            className="emoji-option"
                            type="button"
                            onClick={() => handleThrowEmoji(user.id, emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className={`participant-card ${user.hasVoted ? "voted" : ""}`}>
                    {revealed ? user.vote || "—" : user.hasVoted ? "✓" : "•"}
                  </div>
                </article>
              ))}
              {roomState.users.length === 0 ? (
                <p className="empty-state">Waiting for the first connection...</p>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Header({ theme, onToggleTheme }) {
  return (
    <header className="topbar">
      <a className="brand" href="/">
        <span className="brand-mark">PP</span>
        <span>Planning Poker</span>
      </a>
      <div className="topbar-actions">
        <button className="ghost-button" type="button" onClick={onToggleTheme}>
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </div>
    </header>
  );
}

function buildThrowVisuals({ throwEvents, participantPanelRef, participantRefs }) {
  const panel = participantPanelRef.current;
  if (!panel) {
    return [];
  }

  const panelRect = panel.getBoundingClientRect();

  return throwEvents
    .map((event) => {
      const targetNode = participantRefs.current.get(event.targetUserId);
      if (!targetNode) {
        return null;
      }

      const targetRect = targetNode.getBoundingClientRect();
      const sourceNode = participantRefs.current.get(event.fromUserId);
      const sourceRect = sourceNode?.getBoundingClientRect();
      const startX = sourceRect
        ? sourceRect.left - panelRect.left + Math.min(sourceRect.width - 56, 52)
        : -24;
      const startY = sourceRect
        ? sourceRect.top - panelRect.top + sourceRect.height * 0.5
        : 24;
      const endX = targetRect.left - panelRect.left + targetRect.width - 42;
      const endY = targetRect.top - panelRect.top + targetRect.height * 0.45;

      return {
        ...event,
        startX,
        startY,
        endX,
        endY,
      };
    })
    .filter(Boolean);
}

export default App;
