import type { GameRules } from "./game";
import type { Tier } from "./rewards";

/**
 * Harbor bands from top to bottom: the farthest waters sit on the horizon,
 * coastal trade runs along the dock. Each ship sails in its tier's band.
 */
export const HARBOR_LANES: readonly Tier[] = [
  "kraken_waters",
  "deep_ocean",
  "open_sea",
  "coastal",
];

/** Longest voyage the config offers; that ship reaches the far edge. */
export function maxVoyageMs(rules: GameRules | null): number {
  if (!rules) return 0;
  let max = 0;
  for (const tier of Object.values(rules.tiers)) {
    for (const option of tier.durations) {
      if (option.durationMs > max) max = option.durationMs;
    }
  }
  return max;
}

/**
 * How far across the harbor a ship is, 0 (dock) to 1 (far edge), measured
 * against the longest voyage. A ship stops at its own duration, so shorter
 * voyages end proportionally closer to the dock.
 */
export function harborReach(
  elapsedMs: number,
  durationMs: number,
  maxMs: number,
): number {
  const scale = maxMs > 0 ? maxMs : durationMs;
  if (scale <= 0) return 0;
  const sailed = Math.min(Math.max(elapsedMs, 0), durationMs);
  return Math.min(sailed / scale, 1);
}
