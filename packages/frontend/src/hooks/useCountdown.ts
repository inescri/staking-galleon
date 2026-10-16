import { useState, useEffect, useRef, useCallback } from "react";

interface CountdownResult {
  remainingMs: number;
  /** Real time at sea since `startedAt`; keeps growing after the voyage ends. */
  elapsedMs: number;
  minutes: number;
  seconds: number;
  progress: number; // 0 to 1
  isComplete: boolean;
}

/**
 * Counts down a voyage. `startedAt === 0` means the ship has not sailed yet
 * (stake pull in flight): nothing has elapsed and nothing is complete.
 */
export function useCountdown(
  startedAt: number,
  durationMs: number,
  onComplete?: () => void,
): CountdownResult {
  const notStarted = startedAt === 0;

  const calcElapsed = useCallback(() => {
    return notStarted ? 0 : Math.max(0, Date.now() - startedAt);
  }, [notStarted, startedAt]);

  const [elapsedMs, setElapsedMs] = useState(calcElapsed);
  const completedRef = useRef(false);

  // Re-sync when the countdown target changes (a re-synced ship):
  // adjust state during render instead of in the effect below.
  const [prevCalc, setPrevCalc] = useState(() => calcElapsed);
  if (prevCalc !== calcElapsed) {
    setPrevCalc(() => calcElapsed);
    setElapsedMs(calcElapsed());
  }

  useEffect(() => {
    completedRef.current = false;

    const interval = setInterval(() => {
      const elapsed = calcElapsed();
      setElapsedMs(elapsed);

      if (!notStarted && elapsed >= durationMs && !completedRef.current) {
        completedRef.current = true;
        clearInterval(interval);
        onComplete?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [calcElapsed, notStarted, durationMs, onComplete]);

  const remainingMs = Math.max(0, durationMs - elapsedMs);
  const isComplete = !notStarted && remainingMs <= 0;
  const progress = isComplete ? 1 : 1 - remainingMs / durationMs;
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return { remainingMs, elapsedMs, minutes, seconds, progress, isComplete };
}
