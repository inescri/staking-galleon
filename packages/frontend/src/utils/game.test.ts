import { describe, expect, it } from "vitest";
import { Principal } from "@dfinity/principal";

import type { GameConfig, Ship } from "../canister/idl";
import {
  isActiveStatus,
  parseGameConfig,
  parseTokenAmount,
  shipToCompleted,
  shipToExpedition,
} from "./game";

function ship(overrides: Partial<Ship> = {}): Ship {
  return {
    id: 7n,
    owner: Principal.anonymous(),
    difficulty: { open_sea: null },
    durationIndex: 1,
    stake: 50_000_000_000_000n,
    durationMs: 86_400_000n,
    multiplierBps: 12_200,
    failBps: 2_000,
    reservedReward: 11_000_000_000_000n,
    startedAt: 1_700_000_000_000n,
    endsAt: 1_700_086_400_000n,
    status: { sailing: null },
    payout: 0n,
    outcome: [],
    roll: [],
    settledAt: [],
    paidAt: [],
    ...overrides,
  };
}

describe("parseGameConfig", () => {
  it("keys difficulties by tier and indexes durations", () => {
    const config: GameConfig = {
      maxShips: 5,
      difficulties: [
        {
          difficulty: { coastal: null },
          name: "Coastal Trade",
          stake: 10n,
          durations: [
            {
              label: "1h",
              durationMs: 3_600_000n,
              failBps: 500,
              multiplierBps: 10_300,
            },
            {
              label: "1d",
              durationMs: 86_400_000n,
              failBps: 1_500,
              multiplierBps: 11_500,
            },
          ],
        },
      ],
    };
    const rules = parseGameConfig(config);
    expect(rules.maxShips).toBe(5);
    expect(rules.tiers.coastal.stake).toBe(10n);
    expect(rules.tiers.coastal.durations[1]).toEqual({
      index: 1,
      label: "1d",
      durationMs: 86_400_000,
      failBps: 1_500,
      multiplierBps: 11_500,
    });
  });
});

describe("shipToExpedition", () => {
  it("converts Candid widths and variants", () => {
    const exp = shipToExpedition(ship());
    expect(exp).toEqual({
      id: "7",
      shipId: 7n,
      tier: "open_sea",
      stake: 50_000_000_000_000n,
      reward: 11_000_000_000_000n,
      durationMs: 86_400_000,
      startedAt: 1_700_000_000_000,
      endsAt: 1_700_086_400_000,
      failBps: 2_000,
      multiplierBps: 12_200,
      status: "sailing",
    });
  });
});

describe("shipToCompleted", () => {
  it("marks a lost ship with zero payout", () => {
    const done = shipToCompleted(
      ship({
        status: { lost: null },
        outcome: [{ lost: null }],
        settledAt: [5n],
      }),
    );
    expect(done.succeeded).toBe(false);
    expect(done.payout).toBe(0n);
    expect(done.completedAt).toBe(5);
  });

  it("marks a paid ship with its payout", () => {
    const done = shipToCompleted(
      ship({ status: { paid: null }, payout: 61_000_000_000_000n }),
    );
    expect(done.succeeded).toBe(true);
    expect(done.payout).toBe(61_000_000_000_000n);
    expect(done.completedAt).toBe(1_700_086_400_000);
  });
});

describe("isActiveStatus", () => {
  it("keeps everything but paid and lost in the fleet", () => {
    expect(isActiveStatus("sailing")).toBe(true);
    expect(isActiveStatus("payout_pending")).toBe(true);
    expect(isActiveStatus("paid")).toBe(false);
    expect(isActiveStatus("lost")).toBe(false);
  });
});

describe("parseTokenAmount", () => {
  const units = { decimals: 3, divisibility: 8 };

  it("converts plain decimals to base units", () => {
    expect(parseTokenAmount("1", units)).toBe(100_000_000_000n);
    expect(parseTokenAmount(" 12.5 ", units)).toBe(1_250_000_000_000n);
    expect(parseTokenAmount("0.00000000001", units)).toBe(1n);
  });

  it("truncates digits beyond the token precision", () => {
    expect(parseTokenAmount("0.000000000019", units)).toBe(1n);
  });

  it("rejects anything that is not a positive plain decimal", () => {
    for (const bad of [
      "",
      "0",
      "0.0",
      "-1",
      "1e-7",
      "1e21",
      ".5",
      "1.",
      "abc",
    ]) {
      expect(parseTokenAmount(bad, units)).toBeNull();
    }
  });
});
