export const DECKS = {
  fibonacci: {
    label: "Fibonacci",
    values: ["0", "1/2", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89"] as const,
  },
  base2: {
    label: "Base 2",
    values: ["0", "1", "2", "4", "8", "16", "32", "64", "128"] as const,
  },
  regular: {
    label: "Regular (1-12)",
    values: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const,
  },
} as const;

export const DEFAULT_DECK = "fibonacci";
export const VOTE_OPTIONS = DECKS.fibonacci.values;

export const THROW_EMOJIS = [
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
] as const;

export const SPECTATOR_KEY = "planning-poker-spectator";
export const CLIENT_ID_KEY = "planning-poker-client-id";
export const DISPLAY_NAME_KEY = "planning-poker-display-name";
export const THEME_KEY = "planning-poker-theme";
export const DECK_KEY = "planning-poker-deck";
