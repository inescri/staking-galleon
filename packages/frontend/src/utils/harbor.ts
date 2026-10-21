import type { GameRules } from "./game";
import type { Tier } from "./rewards";

/**
 * Harbor columns from left to right: coastal trade nearest shore, kraken
 * waters farthest out. Each ship sails across its tier's column.
 */
export const HARBOR_LANES: readonly Tier[] = [
  "coastal",
  "open_sea",
  "deep_ocean",
  "kraken_waters",
];

/** Longest voyage each tier offers; that ship reaches its column's far edge. */
export function maxVoyageMsByTier(
  rules: GameRules | null,
): Partial<Record<Tier, number>> {
  const out: Partial<Record<Tier, number>> = {};
  if (!rules) return out;
  for (const [tier, tierRules] of Object.entries(rules.tiers) as [
    Tier,
    GameRules["tiers"][Tier],
  ][]) {
    out[tier] = Math.max(0, ...tierRules.durations.map((o) => o.durationMs));
  }
  return out;
}

/**
 * How far across its column a ship is, 0 (near edge) to 1 (far edge),
 * measured against its tier's longest voyage. A ship stops at its own
 * duration, so shorter voyages end proportionally earlier.
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
