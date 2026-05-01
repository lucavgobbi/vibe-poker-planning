import type { MutableRefObject, RefObject } from "react";
import { CLIENT_ID_KEY, THEME_KEY } from "./constants";
import type { CelebrationBurst, Theme, ThrowEvent, ThrowVisual, VoteValue } from "./types";

export function createSlug(): string {
  return `room-${Math.random().toString(36).slice(2, 8)}`;
}

export function getRoomIdFromPath(): string {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
  return path || "";
}

export function getStoredClientId(): string {
  const existing = window.localStorage.getItem(CLIENT_ID_KEY);
  if (existing) {
    return existing;
  }

  const created = crypto.randomUUID();
  window.localStorage.setItem(CLIENT_ID_KEY, created);
  return created;
}

export function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getInitialTheme(): Theme {
  const storedTheme = window.localStorage.getItem(THEME_KEY);
  return storedTheme === "light" || storedTheme === "dark" ? storedTheme : getSystemTheme();
}

export function inferSocketBaseUrl(): string {
  if (import.meta.env.VITE_WS_BASE_URL) {
    return import.meta.env.VITE_WS_BASE_URL;
  }

  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "ws://127.0.0.1:8787";
  }

  return "";
}

export function getSocketUrl(roomId: string, name: string, clientId: string) {
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

export function createCelebrationBursts(): CelebrationBurst[] {
  return Array.from({ length: 24 }, (_, index) => ({
    id: `burst-${index}-${Math.random().toString(36).slice(2, 8)}`,
    left: 6 + Math.random() * 88,
    delay: Math.random() * 220,
    duration: 1300 + Math.random() * 900,
    rotation: -120 + Math.random() * 240,
    drift: -90 + Math.random() * 180,
    color: `hsl(${Math.round(8 + Math.random() * 120)} 92% ${48 + Math.random() * 12}%)`,
  }));
}

export function toVoteNumber(vote: VoteValue | null): number | null {
  if (vote === null) {
    return null;
  }

  if (vote === "1/2") {
    return 0.5;
  }

  const parsed = Number(vote);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildThrowVisuals({
  throwEvents,
  participantPanelRef,
  participantNameRefs,
}: {
  throwEvents: ThrowEvent[];
  participantPanelRef: RefObject<HTMLDivElement | null>;
  participantNameRefs: MutableRefObject<Map<string, HTMLElement>>;
}): ThrowVisual[] {
  const panel = participantPanelRef.current;
  if (!panel) {
    return [];
  }

  const panelRect = panel.getBoundingClientRect();

  return throwEvents
    .map((event) => {
      const targetNode = participantNameRefs.current.get(event.targetUserId);
      if (!targetNode) {
        return null;
      }

      const targetRect = targetNode.getBoundingClientRect();
      const endX = targetRect.left - panelRect.left + targetRect.width * 0.5 - 18;
      const endY = targetRect.top - panelRect.top + targetRect.height * 0.5 - 18;
      const seed = Array.from(event.id || "")
        .reduce((total, character) => total + character.charCodeAt(0), 0) + (event.sentAt || 0);
      const side = seed % 4;
      const horizontalRange = Math.max(60, panelRect.width - 60);
      const verticalRange = Math.max(60, panelRect.height - 60);
      const horizontalOffset = 30 + (seed % horizontalRange);
      const verticalOffset = 30 + ((seed * 7) % verticalRange);
      let startX = -44;
      let startY = verticalOffset;

      if (side === 1) {
        startX = panelRect.width + 44;
        startY = verticalOffset;
      }

      if (side === 2) {
        startX = horizontalOffset;
        startY = -44;
      }

      if (side === 3) {
        startX = horizontalOffset;
        startY = panelRect.height + 44;
      }

      const midX = startX + (endX - startX) * 0.5;
      const midY = startY + (endY - startY) * 0.5 - 24;

      return {
        ...event,
        startX,
        startY,
        midX,
        midY,
        endX,
        endY,
      };
    })
    .filter((event): event is ThrowVisual => Boolean(event));
}
