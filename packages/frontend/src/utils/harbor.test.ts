import { describe, it, expect } from "vitest";
import {
  HARBOR_LANES,
  HARBOR_LANE_WEIGHTS,
  harborReach,
  lanePerspective,
  maxVoyageMs,
} from "./harbor";
import { TIERS } from "./rewards";
import type { GameRules, TierRules } from "./game";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function tier(...durations: number[]): TierRules {
  return {
    name: "t",
    stake: 1n,
    durations: durations.map((durationMs, index) => ({
      index,
      label: `${index}`,
      durationMs,
      failBps: 0,
      multiplierBps: 10_000,
    })),
  };
}

describe("HARBOR_LANES", () => {
  it("has every tier exactly once", () => {
    expect([...HARBOR_LANES].sort()).toEqual([...TIERS].sort());
  });
});

describe("lanePerspective", () => {
  it("has a weight per lane", () => {
    expect(HARBOR_LANE_WEIGHTS).toHaveLength(HARBOR_LANES.length);
  });

  it("shrinks and hazes ships toward the horizon", () => {
    const far = lanePerspective("kraken_waters");
    const near = lanePerspective("coastal");
    expect(far.depth).toBe(1);
    expect(near.depth).toBe(0);
    expect(near.scale).toBe(1);
    expect(near.opacity).toBe(1);
    expect(far.scale).toBeLessThan(lanePerspective("deep_ocean").scale);
    expect(far.opacity).toBeLessThan(near.opacity);
  });

  it("centres ships in their band, top to bottom", () => {
    const tops = HARBOR_LANES.map((t) => lanePerspective(t).topPct);
    expect(tops[0]).toBeGreaterThan(0);
    expect(tops[tops.length - 1]).toBeLessThan(100);
    for (let i = 1; i < tops.length; i++) {
      expect(tops[i]).toBeGreaterThan(tops[i - 1]);
    }
  });
});

describe("maxVoyageMs", () => {
  it("is 0 without rules", () => {
    expect(maxVoyageMs(null)).toBe(0);
  });

  it("picks the longest duration across tiers", () => {
    const rules: GameRules = {
      maxShips: 5,
      tiers: {
        coastal: tier(HOUR, DAY),
        open_sea: tier(6 * HOUR, 3 * DAY),
        deep_ocean: tier(7 * DAY, DAY),
        kraken_waters: tier(3 * DAY),
      },
    };
    expect(maxVoyageMs(rules)).toBe(7 * DAY);
  });
});

describe("harborReach", () => {
  it("starts at the dock", () => {
    expect(harborReach(0, DAY, 7 * DAY)).toBe(0);
    expect(harborReach(-5, DAY, 7 * DAY)).toBe(0);
  });

  it("moves linearly against the longest voyage", () => {
    expect(harborReach(DAY, 7 * DAY, 7 * DAY)).toBeCloseTo(1 / 7);
  });

  it("stops at the ship's own duration", () => {
    expect(harborReach(DAY, DAY, 7 * DAY)).toBeCloseTo(1 / 7);
    expect(harborReach(30 * DAY, DAY, 7 * DAY)).toBeCloseTo(1 / 7);
    expect(harborReach(30 * DAY, 7 * DAY, 7 * DAY)).toBe(1);
  });

  it("falls back to the ship's duration without a max", () => {
    expect(harborReach(HOUR, 2 * HOUR, 0)).toBe(0.5);
    expect(harborReach(HOUR, 0, 0)).toBe(0);
  });
});
