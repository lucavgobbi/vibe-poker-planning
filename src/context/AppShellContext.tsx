import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DISPLAY_NAME_KEY, THEME_KEY } from "../lib/constants";
import { POSTHOG_KEY, initPostHog, posthog } from "../lib/posthog";
import { getInitialTheme, getRoomIdFromPath, getStoredClientId } from "../lib/room";
import type { Theme } from "../lib/types";

type Screen = "landing" | "join" | "room";

type AppShellContextValue = {
  screen: Screen;
  roomId: string;
  joinedName: string;
  initialName: string;
  theme: Theme;
  joinRoom: (name: string) => void;
  leaveRoom: () => void;
  returnHome: () => void;
  toggleTheme: () => void;
};

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function AppShellProvider({ children }: { children: ReactNode }) {
  const [roomId, setRoomId] = useState(getRoomIdFromPath());
  const [joinedName, setJoinedName] = useState("");
  const [theme, setTheme] = useState<Theme>(getInitialTheme());
  const clientId = useMemo(getStoredClientId, []);
  const initialName = window.localStorage.getItem(DISPLAY_NAME_KEY) || "";

  useEffect(() => {
    const storedName = window.localStorage.getItem(DISPLAY_NAME_KEY);
    if (storedName) {
      setJoinedName(storedName);
    }
  }, []);

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    if (!POSTHOG_KEY) {
      return;
    }

    posthog.identify(clientId, {
      display_name: joinedName || undefined,
    });
  }, [clientId, joinedName]);

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

  const screen: Screen = !roomId ? "landing" : !joinedName ? "join" : "room";

  const value = useMemo<AppShellContextValue>(
    () => ({
      screen,
      roomId,
      joinedName,
      initialName,
      theme,
      joinRoom: (name: string) => {
        window.localStorage.setItem(DISPLAY_NAME_KEY, name);
        setJoinedName(name);
      },
      leaveRoom: () => {
        setJoinedName("");
      },
      returnHome: () => {
        window.location.assign("/");
      },
      toggleTheme: () => {
        setTheme((current) => (current === "dark" ? "light" : "dark"));
      },
    }),
    [screen, roomId, joinedName, initialName, theme],
  );

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useAppShellContext() {
  const context = useContext(AppShellContext);
  if (!context) {
    throw new Error("useAppShellContext must be used within an AppShellProvider");
  }

  return context;
}
