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

/**
 * Relative band heights, horizon first. Bands thin out toward the horizon
 * so the sea reads as receding.
 */
export const HARBOR_LANE_WEIGHTS: readonly number[] = [0.7, 0.9, 1.1, 1.3];

/** Sprite scale and opacity on the horizon band; the dock band is 1. */
const FAR_SCALE = 0.5;
const FAR_OPACITY = 0.75;
/** Wave size on the horizon band; the dock band is 1. */
const FAR_WAVE_SCALE = 0.3;
/** Wave scroll speed on the horizon band; the dock band is 1. */
const FAR_WAVE_SPEED = 0.25;

export interface LanePerspective {
  /** Band centre, % of the ocean height from the top. */
  topPct: number;
  /** 0 on the dock band, 1 on the horizon band. */
  depth: number;
  scale: number;
  opacity: number;
  /** Wave size factor; farther bands get smaller waves. */
  waveScale: number;
  /** Wave scroll speed factor; farther bands roll slower. */
  waveSpeed: number;
}

/** Where a tier's band sits and how far away its ships look. */
export function lanePerspective(tier: Tier): LanePerspective {
  const lane = Math.max(HARBOR_LANES.indexOf(tier), 0);
  const total = HARBOR_LANE_WEIGHTS.reduce((a, b) => a + b, 0);
  const above = HARBOR_LANE_WEIGHTS.slice(0, lane).reduce((a, b) => a + b, 0);
  const topPct = ((above + HARBOR_LANE_WEIGHTS[lane] / 2) / total) * 100;
  const depth = 1 - lane / (HARBOR_LANES.length - 1);
  return {
    topPct,
    depth,
    scale: 1 - (1 - FAR_SCALE) * depth,
    opacity: 1 - (1 - FAR_OPACITY) * depth,
    waveScale: 1 - (1 - FAR_WAVE_SCALE) * depth,
    waveSpeed: 1 - (1 - FAR_WAVE_SPEED) * depth,
  };
}

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
