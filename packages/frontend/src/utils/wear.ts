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
