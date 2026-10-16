import { describe, it, expect } from "vitest";
import { seaDepth, wearLevel } from "./wear";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

describe("wearLevel", () => {
  it("is fresh for the first hours at sea", () => {
    expect(wearLevel(0)).toBe("fresh");
    expect(wearLevel(-5)).toBe("fresh");
    expect(wearLevel(6 * HOUR - 1)).toBe("fresh");
  });

  it("weathers after 6h, batters after 1d, derelict after 3d", () => {
    expect(wearLevel(6 * HOUR)).toBe("weathered");
    expect(wearLevel(DAY - 1)).toBe("weathered");
    expect(wearLevel(DAY)).toBe("battered");
    expect(wearLevel(3 * DAY - 1)).toBe("battered");
    expect(wearLevel(3 * DAY)).toBe("derelict");
    expect(wearLevel(30 * DAY)).toBe("derelict");
  });
});

describe("seaDepth", () => {
  it("starts at the dock and caps at the horizon", () => {
    expect(seaDepth(0)).toBe(0);
    expect(seaDepth(-1)).toBe(0);
    expect(seaDepth(7 * DAY)).toBe(1);
    expect(seaDepth(30 * DAY)).toBe(1);
  });

  it("moves out monotonically, fast early and slower later", () => {
    const d1h = seaDepth(HOUR);
    const d1d = seaDepth(DAY);
    const d3d = seaDepth(3 * DAY);
    expect(d1h).toBeGreaterThan(0.1);
    expect(d1d).toBeGreaterThan(d1h);
    expect(d3d).toBeGreaterThan(d1d);
    expect(d3d).toBeLessThan(1);
    expect(d1d - d1h).toBeGreaterThan(d3d - d1d);
  });
});
