import { describe, it, expect } from "vitest";
import {
  HARBOR_LANES,
  harborReach,
  lanePerspective,
  shipTopPct,
  maxVoyageMsByTier,
} from "./harbor";
import { TIERS } from "./rewards";
import type { GameRules, TierRules } from "./game";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function tier(...durations: number[]): TierRules {
  return {
    stake: 1n,
    durations: durations.map((durationMs, index) => ({
      index,
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

  it("runs from the horizon (kraken) down to the dock (coastal)", () => {
    expect(HARBOR_LANES[0]).toBe("kraken_waters");
    expect(HARBOR_LANES[HARBOR_LANES.length - 1]).toBe("coastal");
  });
});

describe("lanePerspective", () => {
  it("thins bands toward the horizon and fills the ocean", () => {
    const lanes = HARBOR_LANES.map(lanePerspective);
    for (let i = 1; i < lanes.length; i++) {
      expect(lanes[i].weight).toBeGreaterThan(lanes[i - 1].weight);
    }
    const total = lanes.reduce((sum, l) => sum + l.heightPct, 0);
    expect(total).toBeCloseTo(100);
  });

  it("returns the same object on every call", () => {
    expect(lanePerspective("open_sea")).toBe(lanePerspective("open_sea"));
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
    expect(near.waveScale).toBe(1);
    expect(far.waveScale).toBeLessThan(far.scale);
    expect(near.waveSpeed).toBe(1);
    expect(far.waveSpeed).toBeLessThan(far.scale);
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

describe("maxVoyageMsByTier", () => {
  it("is empty without rules", () => {
    expect(maxVoyageMsByTier(null)).toEqual({});
  });

  it("picks the longest duration within each tier", () => {
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
    expect(harborReach(0, 7 * DAY)).toBe(0);
    expect(harborReach(-5, 7 * DAY)).toBe(0);
  });

  it("moves short voyages visibly away from the dock", () => {
    // 1h of a 1d tier max: well past the linear 1/24.
    expect(harborReach(HOUR, DAY)).toBeGreaterThan(0.2);
    expect(harborReach(6 * HOUR, DAY)).toBeCloseTo(Math.log(7) / Math.log(25));
  });

  it("moves out monotonically, fast early and slower later", () => {
    const r1h = harborReach(HOUR, 7 * DAY);
    const r1d = harborReach(DAY, 7 * DAY);
    const r3d = harborReach(3 * DAY, 7 * DAY);
    expect(r1d).toBeGreaterThan(r1h);
    expect(r3d).toBeGreaterThan(r1d);
    expect(r1d - r1h).toBeGreaterThan(r3d - r1d);
  });

  it("reaches the far edge at the tier's longest voyage and caps there", () => {
    expect(harborReach(7 * DAY, 7 * DAY)).toBe(1);
    expect(harborReach(30 * DAY, 7 * DAY)).toBe(1);
  });

  it("stays at the dock without a max", () => {
    expect(harborReach(HOUR, 0)).toBe(0);
  });
});

describe("shipTopPct", () => {
  it("puts the first ship on the band centre", () => {
    expect(shipTopPct("coastal", 0)).toBe(lanePerspective("coastal").topPct);
  });

  it("gives ships of one band distinct rows inside the band", () => {
    const lane = lanePerspective("open_sea");
    const tops = [0, 1, 2, 3, 4].map((s) => shipTopPct("open_sea", s));
    expect(new Set(tops).size).toBe(tops.length);
    for (const top of tops) {
      expect(Math.abs(top - lane.topPct)).toBeLessThan(lane.heightPct / 2);
    }
  });

  it("repeats rows after the last one", () => {
    expect(shipTopPct("coastal", 5)).toBe(shipTopPct("coastal", 0));
  });
});
