import { describe, it, expect } from "vitest";
import { HARBOR_LANES, harborReach, maxVoyageMsByTier } from "./harbor";
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

describe("maxVoyageMsByTier", () => {
  it("is empty without rules", () => {
    expect(maxVoyageMsByTier(null)).toEqual({});
  });

  it("picks the longest duration of each tier", () => {
    const rules: GameRules = {
      maxShips: 5,
      tiers: {
        coastal: tier(HOUR, DAY),
        open_sea: tier(6 * HOUR, 3 * DAY),
        deep_ocean: tier(7 * DAY, DAY),
        kraken_waters: tier(3 * DAY),
      },
    };
    expect(maxVoyageMsByTier(rules)).toEqual({
      coastal: DAY,
      open_sea: 3 * DAY,
      deep_ocean: 7 * DAY,
      kraken_waters: 3 * DAY,
    });
  });
});

describe("harborReach", () => {
  it("starts at the dock", () => {
    expect(harborReach(0, DAY, 7 * DAY)).toBe(0);
    expect(harborReach(-5, DAY, 7 * DAY)).toBe(0);
  });

  it("moves linearly against the tier's longest voyage", () => {
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
