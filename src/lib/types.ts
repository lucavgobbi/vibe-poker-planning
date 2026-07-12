import type { THROW_EMOJIS } from "./constants";

export type DeckType = "fibonacci" | "base2" | "regular";

export type VoteValue =
  | "0" | "1/2" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | "10" | "11" | "12" | "13" | "16" | "21" | "32" | "34" | "55" | "64" | "89" | "128";

export type ThrowEmoji = (typeof THROW_EMOJIS)[number];
export type Theme = "light" | "dark";
export type ConnectionState = "idle" | "connecting" | "connected" | "reconnecting" | "error";

export type RoomUser = {
  id: string;
  name: string;
  vote: VoteValue | null;
  hasVoted: boolean;
};

export type RoomState = {
  revealed: boolean;
  deck: DeckType;
  users: RoomUser[];
};

export type ThrowEvent = {
  type: "throw";
  id: string;
  emoji: ThrowEmoji;
  fromUserId: string;
  fromUserName: string;
  targetUserId: string;
  targetUserName: string;
  sentAt: number;
};

export type ThrowVisual = ThrowEvent & {
  startX: number;
  startY: number;
  midX: number;
  midY: number;
  endX: number;
  endY: number;
};

export type CelebrationBurst = {
  id: string;
  left: number;
  delay: number;
  duration: number;
  rotation: number;
  drift: number;
  color: string;
};

export type ClientMessage =
  | { type: "vote"; value: VoteValue }
  | { type: "throw"; targetUserId: string; emoji: ThrowEmoji }
  | { type: "reveal" }
  | { type: "reset" };
