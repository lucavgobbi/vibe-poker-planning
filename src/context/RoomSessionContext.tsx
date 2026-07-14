import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRoomSocket } from "../hooks/useRoomSocket";
import { capturePostHog } from "../lib/posthog";
import { getStoredClientId, getStoredDeck, toVoteNumber } from "../lib/room";
import { SPECTATOR_KEY } from "../lib/constants";
import type {
  ConnectionState,
  RoomState,
  ThrowEmoji,
  ThrowEvent,
  VoteValue,
} from "../lib/types";
import { useAppShellContext } from "./AppShellContext";

type RoomSessionContextValue = {
  connectionState: ConnectionState;
  errorMessage: string;
  roomState: RoomState;
  throwEvents: ThrowEvent[];
  currentVote: VoteValue | null;
  revealed: boolean;
  isSpectator: boolean;
  unanimousVote: string;
  averageScore: string | null;
  copyRoomLink: () => Promise<void>;
  throwEmoji: (targetUserId: string, emoji: ThrowEmoji) => void;
  vote: (value: VoteValue) => void;
  revealVotes: () => void;
  resetVotes: () => void;
  userLabelFor: (userId: string) => "You" | "Spectator" | "Participant";
};

const RoomSessionContext = createContext<RoomSessionContextValue | null>(null);

export function RoomSessionProvider({ children }: { children: ReactNode }) {
  const { roomId, joinedName } = useAppShellContext();
  const clientId = useMemo(getStoredClientId, []);
  const [deck] = useState(getStoredDeck);
  const joinedRoomKeyRef = useRef("");
  const [selectedVote, setSelectedVote] = useState<VoteValue | null>(null);
  const enabled = Boolean(roomId && joinedName);
  const joinAsSpectator = window.localStorage.getItem(SPECTATOR_KEY) === "true";

  const { connectionState, errorMessage, roomState, throwEvents, sendMessage } = useRoomSocket({
    roomId,
    joinedName,
    enabled,
    clientId,
    deck,
    spectator: joinAsSpectator,
  });

  useEffect(() => {
    if (!roomId || !joinedName || connectionState !== "connected") {
      return;
    }

    const joinKey = `${roomId}:${clientId}:${joinedName}`;
    if (joinedRoomKeyRef.current === joinKey) {
      return;
    }

    joinedRoomKeyRef.current = joinKey;
    capturePostHog("UserJoined", {
      roomId,
      userId: clientId,
      userName: joinedName,
      participantCount: roomState.users.length,
    });
  }, [clientId, connectionState, joinedName, roomId, roomState.users.length]);

  const currentUser = roomState.users.find((user) => user.id === clientId);
  const currentVote = currentUser?.vote ?? null;
  const isSpectator = currentUser?.isSpectator ?? false;
  const revealed = roomState.revealed;

  useEffect(() => {
    if (!enabled) {
      setSelectedVote(null);
      return;
    }

    if (currentVote) {
      setSelectedVote(currentVote);
      return;
    }

    const votesCleared = !roomState.revealed && roomState.users.every((user) => !user.hasVoted && !user.vote);
    if (votesCleared) {
      setSelectedVote(null);
    }
  }, [currentVote, enabled, roomState.revealed, roomState.users]);
  const unanimousVote = useMemo(() => {
    const voters = roomState.users.filter((user) => !user.isSpectator);
    if (!revealed || voters.length === 0) {
      return "";
    }

    const votes = voters.map((user) => user.vote);
    if (votes.some((vote) => !vote)) {
      return "";
    }

    return votes.every((vote) => vote === votes[0]) ? (votes[0] ?? "") : "";
  }, [revealed, roomState.users]);
  const averageScore = useMemo(() => {
    if (!revealed) {
      return null;
    }

    const numericVotes = roomState.users
      .map((user) => toVoteNumber(user.vote))
      .filter((value): value is number => value !== null);
    if (numericVotes.length === 0) {
      return null;
    }

    const total = numericVotes.reduce((sum, value) => sum + value, 0);
    return (total / numericVotes.length).toFixed(1);
  }, [revealed, roomState.users]);
  const shareUrl = roomId ? `${window.location.origin}/${roomId}` : window.location.origin;

  const captureAnalytics = (eventName: string, metadata: Record<string, unknown> = {}) => {
    capturePostHog(eventName, {
      roomId,
      userId: clientId,
      userName: joinedName,
      participantCount: roomState.users.length,
      ...metadata,
    });
  };

  const value = useMemo<RoomSessionContextValue>(
    () => ({
      connectionState,
      errorMessage,
      roomState,
      throwEvents,
      currentVote: selectedVote,
      revealed,
      isSpectator,
      unanimousVote,
      averageScore,
      copyRoomLink: async () => {
        try {
          await navigator.clipboard.writeText(shareUrl);
        } catch {
          window.prompt("Copy room URL", shareUrl);
        }
      },
      throwEmoji: (targetUserId: string, emoji: ThrowEmoji) => {
        sendMessage({
          type: "throw",
          targetUserId,
          emoji,
        });
      },
      vote: (value: VoteValue) => {
        const sent = sendMessage({ type: "vote", value });
        if (!sent) {
          return;
        }

        setSelectedVote(value);
        captureAnalytics("UserVoted", {
          vote: value,
          revealed,
        });
      },
      revealVotes: () => {
        const sent = sendMessage({ type: "reveal" });
        if (!sent) {
          return;
        }

        captureAnalytics("VotesRevealed", {
          votedCount: roomState.users.filter((user) => user.hasVoted).length,
          revealedBy: joinedName,
        });
      },
      resetVotes: () => {
        const sent = sendMessage({ type: "reset" });
        if (!sent) {
          return;
        }

        setSelectedVote(null);
        captureAnalytics("VotesReset", {
          votesBeforeReset: roomState.users.filter((user) => user.hasVoted).length,
          wasRevealed: revealed,
        });
      },
      userLabelFor: (userId: string) =>
        userId === clientId ? (isSpectator ? "Spectator" : "You") : "Participant",
    }),
    [
      averageScore,
      clientId,
      connectionState,
      errorMessage,
      isSpectator,
      joinedName,
      revealed,
      roomId,
      roomState,
      shareUrl,
      selectedVote,
      throwEvents,
      unanimousVote,
      sendMessage,
    ],
  );

  return <RoomSessionContext.Provider value={value}>{children}</RoomSessionContext.Provider>;
}

export function useRoomSessionContext() {
  const context = useContext(RoomSessionContext);
  if (!context) {
    throw new Error("useRoomSessionContext must be used within a RoomSessionProvider");
  }

  return context;
}
