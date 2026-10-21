import { describe, expect, it } from "vitest";

import { formatRemainingMs } from "./rewards";

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
