import { useState, useEffect, useRef, useCallback } from "react";

interface CountdownResult {
  remainingMs: number;
  minutes: number;
  seconds: number;
  progress: number; // 0 to 1
  isComplete: boolean;
}

export function useCountdown(
  startedAt: number,
  durationMs: number,
  onComplete?: () => void,
): CountdownResult {
  const calcRemaining = useCallback(() => {
    return Math.max(0, startedAt + durationMs - Date.now());
  }, [startedAt, durationMs]);

  const [remainingMs, setRemainingMs] = useState(calcRemaining);
  const completedRef = useRef(false);

  useEffect(() => {
    completedRef.current = false;
    setRemainingMs(calcRemaining());

    const interval = setInterval(() => {
      const remaining = calcRemaining();
      setRemainingMs(remaining);

      if (remaining <= 0 && !completedRef.current) {
        completedRef.current = true;
        clearInterval(interval);
        onComplete?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [calcRemaining, onComplete]);

  const isComplete = remainingMs <= 0;
  const progress = isComplete ? 1 : 1 - remainingMs / durationMs;
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return { remainingMs, minutes, seconds, progress, isComplete };
}
