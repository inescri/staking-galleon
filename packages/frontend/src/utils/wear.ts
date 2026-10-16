/**
 * Ship wear is a display-only effect driven by how long a ship has been at
 * sea. Every ship uses the same sprite; the harbor weathers it with CSS
 * filters keyed on these levels.
 */
export type WearLevel = "fresh" | "weathered" | "battered" | "derelict";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Elapsed time at sea at which each level starts (ascending). */
export const WEAR_THRESHOLDS: readonly { level: WearLevel; afterMs: number }[] =
  [
    { level: "fresh", afterMs: 0 },
    { level: "weathered", afterMs: 6 * HOUR_MS },
    { level: "battered", afterMs: 1 * DAY_MS },
    { level: "derelict", afterMs: 3 * DAY_MS },
  ];

export function wearLevel(elapsedMs: number): WearLevel {
  let level: WearLevel = "fresh";
  for (const step of WEAR_THRESHOLDS) {
    if (elapsedMs >= step.afterMs) level = step.level;
  }
  return level;
}

/** Time at sea after which a ship sits on the horizon (the longest voyage). */
const FAR_MS = 7 * DAY_MS;

/**
 * How far out a ship looks, 0 (just left the dock) to 1 (on the horizon),
 * by time at sea. Logarithmic so the first hours already move the ship
 * while multi-day voyages keep creeping toward the horizon.
 */
export function seaDepth(elapsedMs: number): number {
  const clamped = Math.min(Math.max(elapsedMs, 0), FAR_MS);
  return Math.log1p(clamped / HOUR_MS) / Math.log1p(FAR_MS / HOUR_MS);
}
