import { useEffect, useRef, useState } from "react";
import { getSocketUrl } from "../lib/room";
import type { ClientMessage, ConnectionState, DeckType, RoomState, ThrowEvent } from "../lib/types";

type UseRoomSocketArgs = {
  roomId: string;
  joinedName: string;
  enabled: boolean;
  clientId: string;
  deck: DeckType;
  spectator: boolean;
};

type ServerStatePayload = {
  type: "state";
  revealed: boolean;
  deck: DeckType;
  users: RoomState["users"];
};

type ServerErrorPayload = {
  type: "error";
  message?: string;
};

type ServerPayload = ServerStatePayload | ServerErrorPayload | ThrowEvent;

export function useRoomSocket({ roomId, joinedName, enabled, clientId, deck, spectator }: UseRoomSocketArgs) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [roomState, setRoomState] = useState<RoomState>({
    revealed: false,
    deck,
    users: [],
  });
  const [throwEvents, setThrowEvents] = useState<ThrowEvent[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const shouldReconnectRef = useRef(false);

  useEffect(() => {
    if (!enabled || !roomId) {
      setConnectionState("idle");
      setErrorMessage("");
      setRoomState({
        revealed: false,
        deck,
        users: [],
      });
      setThrowEvents([]);
      return undefined;
    }

    const socketUrl = getSocketUrl(roomId, joinedName, clientId, deck, spectator);
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
          const payload = JSON.parse(event.data as string) as ServerPayload;
          if (payload.type === "state") {
            setRoomState({
              revealed: Boolean(payload.revealed),
              deck: payload.deck,
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
      window.clearTimeout(reconnectTimerRef.current ?? undefined);
      if (socketRef.current) {
        socketRef.current.close(1000, "Leaving room");
      }
    };
  }, [clientId, deck, enabled, joinedName, roomId]);

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

  const sendMessage = (message: ClientMessage) => {
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
