import { describe, expect, it } from "vitest";

import { computePayout as canisterComputePayout } from "../../../canister/src/game";
import { computePayout, formatRemainingMs, formatTl } from "./rewards";

const S = 1000;
const M = 60 * S;
const H = 60 * M;
const D = 24 * H;

describe("formatRemainingMs", () => {
  it.each([
    [0, "0:00"],
    [-5 * S, "0:00"],
    [1500, "0:02"],
    [59 * S, "0:59"],
    [61 * S, "1:01"],
    [59 * M + 59 * S, "59:59"],
    [H, "1:00:00"],
    [H + 5 * S, "1:00:05"],
    [23 * H + 59 * M + 59 * S, "23:59:59"],
    [D, "1d 0:00:00"],
    [2 * D + 3 * H + 4 * M + 5 * S, "2d 3:04:05"],
  ])("%i ms → %s", (ms, expected) => {
    expect(formatRemainingMs(ms)).toBe(expected);
  });
});

describe("formatTl", () => {
  const units = { decimals: 0, divisibility: 0 };

  it("prefixes the coin and appends the short unit", () => {
    expect(formatTl(1234n, units)).toBe("\u{1FA99} 1,234 tl");
  });

  it("puts the sign after the coin", () => {
    expect(formatTl(75n, units, "+")).toBe("\u{1FA99} +75 tl");
    expect(formatTl(100n, units, "−")).toBe("\u{1FA99} −100 tl");
  });
});

describe("computePayout", () => {
  it.each([
    [100_000_000_000n, 10_000, 100_000_000_000n],
    [100_000_000_000n, 11_500, 115_000_000_000n],
    [5_000_000_000_000n, 15_000, 7_500_000_000_000n],
    [7n, 10_300, 7n],
    [333n, 12_200, 406n],
  ])("stake %s at %i bps pays %s", (stake, bps, expected) => {
    expect(computePayout(stake, bps)).toBe(expected);
  });

  it("matches the canister's payout math", () => {
    for (const stake of [0n, 1n, 7n, 333n, 99_999n, 5_000_000_000_000n]) {
      for (const bps of [10_000, 10_001, 10_300, 12_200, 15_000, 1_000_000]) {
        expect(computePayout(stake, bps)).toBe(
          canisterComputePayout(stake, bps),
        );
      }
    }
  });
});
