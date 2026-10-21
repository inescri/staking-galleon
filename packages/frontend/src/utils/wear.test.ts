import { describe, it, expect } from "vitest";
import { wearLevel } from "./wear";

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
