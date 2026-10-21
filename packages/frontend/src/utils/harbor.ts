import type { GameRules } from "./game";
import { TIERS, type Tier } from "./rewards";

/**
 * Relative band heights. Bands thin out toward the horizon so the sea reads
 * as receding. A `Record` so a new tier fails to compile until it gets one.
 */
const BAND_WEIGHTS: Record<Tier, number> = {
  coastal: 1.3,
  open_sea: 1.1,
  deep_ocean: 0.9,
  kraken_waters: 0.7,
};

/**
 * Harbor bands from top to bottom: the farthest waters sit on the horizon,
 * coastal trade runs along the dock. Each ship sails in its tier's band.
 * `TIERS` runs from easiest to hardest, so the bands are its reverse.
 */
export const HARBOR_LANES: readonly Tier[] = [...TIERS].reverse();

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
  /** Relative band height (flex-grow). */
  weight: number;
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

/** Every band's layout and look, computed once. */
const LANE_PERSPECTIVES: Record<Tier, LanePerspective> = (() => {
  const total = HARBOR_LANES.reduce((sum, t) => sum + BAND_WEIGHTS[t], 0);
  const out = {} as Record<Tier, LanePerspective>;
  let above = 0;
  HARBOR_LANES.forEach((tier, lane) => {
    const weight = BAND_WEIGHTS[tier];
    const depth = 1 - lane / (HARBOR_LANES.length - 1);
    out[tier] = {
      weight,
      topPct: ((above + weight / 2) / total) * 100,
      heightPct: (weight / total) * 100,
      depth,
      scale: 1 - (1 - FAR_SCALE) * depth,
      opacity: 1 - (1 - FAR_OPACITY) * depth,
      waveScale: 1 - (1 - FAR_WAVE_SCALE) * depth,
      waveSpeed: 1 - (1 - FAR_WAVE_SPEED) * depth,
    };
    above += weight;
  });
  return out;
})();

/** Where a tier's band sits and how far away its ships look. */
export function lanePerspective(tier: Tier): LanePerspective {
  return LANE_PERSPECTIVES[tier];
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
 * against its tier's longest voyage. Logarithmic in hours, so short voyages
 * visibly leave the dock while long ones keep creeping out.
 *
 * `sailedMs` is the part of its own voyage the ship has covered
 * (`progress * durationMs` from useCountdown), so a ship stops at its own
 * duration and the clamping to it lives in one place.
 */
export function harborReach(sailedMs: number, maxMs: number): number {
  if (maxMs <= 0) return 0;
  const sailed = Math.min(Math.max(sailedMs, 0), maxMs);
  return Math.log1p(sailed / HOUR_MS) / Math.log1p(maxMs / HOUR_MS);
}
