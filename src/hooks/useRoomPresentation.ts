import { useEffect, useMemo, useRef, useState } from "react";
import { buildThrowVisuals, createCelebrationBursts } from "../lib/room";
import type { CelebrationBurst, ThrowEvent } from "../lib/types";

type UseRoomPresentationArgs = {
  throwEvents: ThrowEvent[];
  revealed: boolean;
  unanimousVote: string;
};

export function useRoomPresentation({
  throwEvents,
  revealed,
  unanimousVote,
}: UseRoomPresentationArgs) {
  const [celebrationBursts, setCelebrationBursts] = useState<CelebrationBurst[]>([]);
  const participantPanelRef = useRef<HTMLDivElement | null>(null);
  const participantNameRefs = useRef(new Map<string, HTMLElement>());
  const previousRevealedRef = useRef(false);

  const activeThrows = useMemo(
    () =>
      buildThrowVisuals({
        throwEvents,
        participantPanelRef,
        participantNameRefs,
      }),
    [throwEvents],
  );

  useEffect(() => {
    if (!previousRevealedRef.current && revealed && unanimousVote) {
      setCelebrationBursts(createCelebrationBursts());
    }

    previousRevealedRef.current = revealed;
  }, [revealed, unanimousVote]);

  useEffect(() => {
    if (celebrationBursts.length === 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setCelebrationBursts([]);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [celebrationBursts]);

  return {
    celebrationBursts,
    participantPanelRef,
    activeThrows,
    setParticipantNameRef: (userId: string, node: HTMLElement | null) => {
      if (node) {
        participantNameRefs.current.set(userId, node);
        return;
      }

      participantNameRefs.current.delete(userId);
    },
  };
}
