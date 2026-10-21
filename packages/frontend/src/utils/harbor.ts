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

/**
 * Vertical offsets for ships sharing a band, as a fraction of the band's
 * height from its centre, in launch order. Repeats after the last row.
 */
const ROW_OFFSETS: readonly number[] = [0, -0.3, 0.3, -0.15, 0.15];

const HOUR_MS = 60 * 60 * 1000;

export interface LanePerspective {
  /** Band centre, % of the ocean height from the top. */
  topPct: number;
  /** Band height, % of the ocean height. */
  heightPct: number;
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
  const heightPct = (HARBOR_LANE_WEIGHTS[lane] / total) * 100;
  const depth = 1 - lane / (HARBOR_LANES.length - 1);
  return {
    topPct,
    heightPct,
    depth,
    scale: 1 - (1 - FAR_SCALE) * depth,
    opacity: 1 - (1 - FAR_OPACITY) * depth,
    waveScale: 1 - (1 - FAR_WAVE_SCALE) * depth,
    waveSpeed: 1 - (1 - FAR_WAVE_SPEED) * depth,
  };
}

/** Longest voyage each tier offers; that ship reaches its band's far edge. */
export function maxVoyageMsByTier(
  rules: GameRules | null,
): Partial<Record<Tier, number>> {
  const out: Partial<Record<Tier, number>> = {};
  if (!rules) return out;
  for (const tier of HARBOR_LANES) {
    const durations = rules.tiers[tier]?.durations ?? [];
    out[tier] = Math.max(0, ...durations.map((o) => o.durationMs));
  }
  return out;
}

/**
 * Vertical position (% of the ocean height) of the `slot`-th ship in a
 * tier's band, so ships of the same tier launched together don't stack.
 */
export function shipTopPct(tier: Tier, slot: number): number {
  const lane = lanePerspective(tier);
  const row = ROW_OFFSETS[Math.max(slot, 0) % ROW_OFFSETS.length];
  return lane.topPct + row * lane.heightPct;
}

/**
 * How far across its band a ship is, 0 (dock) to 1 (far edge), measured
 * against its tier's longest voyage. Logarithmic in hours at sea, so short
 * voyages visibly leave the dock while long ones keep creeping out. A ship
 * stops at its own duration, so shorter voyages end closer to the dock.
 */
export function harborReach(
  elapsedMs: number,
  durationMs: number,
  maxMs: number,
): number {
  const scale = maxMs > 0 ? maxMs : durationMs;
  if (scale <= 0) return 0;
  const sailed = Math.min(Math.max(elapsedMs, 0), durationMs);
  const reach = Math.log1p(sailed / HOUR_MS) / Math.log1p(scale / HOUR_MS);
  return Math.min(reach, 1);
}
