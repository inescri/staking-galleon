import { describe, expect, it } from "vitest";

import {
  DEFAULT_CONFIG,
  MAX_FLEET,
  TOKEN_BASE_UNITS,
  tokens,
} from "./default_config";
import {
  BPS,
  DIFFICULTIES,
  ERR,
  MAX_DURATION_MS,
  MIN_DURATION_MS,
  ZERO_POOL,
  applyFund,
  applyLaunchConfirmed,
  applyPaid,
  applyReserve,
  applyReserveRelease,
  applySettleLost,
  applySettleWon,
  applyWithdraw,
  canClaim,
  canReserve,
  canSettle,
  computePayout,
  computeReward,
  countAtSea,
  decideOutcome,
  expectedValueBps,
  isPristine,
  isRecoveryTransition,
  poolTotal,
  rollBps,
  trimOwnerIndex,
  validateAmount,
  validateConfig,
  type GameConfig,
  type PoolState,
  type Ship,
  type ShipStatus,
} from "./game";

function clone(config: GameConfig): GameConfig {
  return {
    maxShips: config.maxShips,
    difficulties: config.difficulties.map((d) => ({
      ...d,
      durations: d.durations.map((o) => ({ ...o })),
    })),
  };
}

function ship(overrides: Partial<Ship> = {}): Ship {
  return {
    id: 1n,
    owner: "aaaaa-aa",
    difficulty: "coastal",
    durationIndex: 0,
    stake: tokens(100),
    durationMs: 3_600_000n,
    multiplierBps: 10_300,
    failBps: 500,
    reservedReward: tokens(3),
    startedAt: 1_000n,
    endsAt: 3_601_000n,
    status: "sailing",
    payout: 0n,
    outcome: null,
    roll: null,
    settledAt: null,
    paidAt: null,
    statusChangedAt: 1_000n,
    ...overrides,
  };
}

describe("default config", () => {
  it("is valid", () => {
    expect(validateConfig(DEFAULT_CONFIG)).toBeNull();
  });

  it("lists difficulties in the frontend's order", () => {
    expect(DEFAULT_CONFIG.difficulties.map((d) => d.difficulty)).toEqual([
      ...DIFFICULTIES,
    ]);
    expect(DEFAULT_CONFIG.maxShips).toBe(MAX_FLEET);
  });

  it("converts whole tokens to base units", () => {
    expect(TOKEN_BASE_UNITS).toBe(100_000_000_000n);
    expect(tokens(100)).toBe(10_000_000_000_000n);
  });

  it("keeps every option's expected value between -5% and 0%", () => {
    for (const tier of DEFAULT_CONFIG.difficulties) {
      for (const option of tier.durations) {
        const ev = expectedValueBps(option.failBps, option.multiplierBps);
        expect(ev, `${tier.difficulty} ${option.label}`).toBeLessThanOrEqual(0);
        expect(ev, `${tier.difficulty} ${option.label}`).toBeGreaterThanOrEqual(
          -500,
        );
      }
    }
  });
});

describe("validateAmount", () => {
  it("accepts positive amounts up to the cap", () => {
    expect(() => validateAmount(1n)).not.toThrow();
    expect(() => validateAmount((1n << 256n) - 1n)).not.toThrow();
  });

  it("rejects zero, negative and oversized", () => {
    expect(() => validateAmount(0n)).toThrow(ERR.INVALID_AMOUNT);
    expect(() => validateAmount(-1n)).toThrow(ERR.INVALID_AMOUNT);
    expect(() => validateAmount(1n << 256n)).toThrow(ERR.INVALID_AMOUNT);
  });
});

describe("validateConfig", () => {
  it("rejects a missing difficulty", () => {
    const c = clone(DEFAULT_CONFIG);
    c.difficulties.pop();
    expect(validateConfig(c)).toMatch(/missing difficulty kraken_waters/);
  });

  it("rejects a duplicate difficulty", () => {
    const c = clone(DEFAULT_CONFIG);
    c.difficulties[1].difficulty = "coastal";
    expect(validateConfig(c)).toMatch(/duplicate/);
  });

  it("rejects a zero stake", () => {
    const c = clone(DEFAULT_CONFIG);
    c.difficulties[0].stake = 0n;
    expect(validateConfig(c)).toMatch(/stake must be positive/);
  });

  it("rejects 0 or 9 durations", () => {
    const c = clone(DEFAULT_CONFIG);
    c.difficulties[0].durations = [];
    expect(validateConfig(c)).toMatch(/1\.\.8 durations/);
    const option = DEFAULT_CONFIG.difficulties[0].durations[0];
    c.difficulties[0].durations = Array.from({ length: 9 }, () => ({
      ...option,
    }));
    expect(validateConfig(c)).toMatch(/1\.\.8 durations/);
  });

  it("rejects durations outside 1 minute .. 30 days", () => {
    const c = clone(DEFAULT_CONFIG);
    c.difficulties[0].durations[0].durationMs = MIN_DURATION_MS - 1n;
    expect(validateConfig(c)).toMatch(/durationMs/);
    c.difficulties[0].durations[0].durationMs = MAX_DURATION_MS + 1n;
    expect(validateConfig(c)).toMatch(/durationMs/);
    c.difficulties[0].durations[0].durationMs = MAX_DURATION_MS;
    expect(validateConfig(c)).toBeNull();
  });

  it("rejects failBps 10000 and multiplierBps below 10000", () => {
    const c = clone(DEFAULT_CONFIG);
    c.difficulties[0].durations[0].failBps = 10_000;
    expect(validateConfig(c)).toMatch(/failBps/);
    c.difficulties[0].durations[0].failBps = 0;
    c.difficulties[0].durations[0].multiplierBps = 9_999;
    expect(validateConfig(c)).toMatch(/multiplierBps/);
  });

  it("rejects an empty label or name and a bad maxShips", () => {
    const c = clone(DEFAULT_CONFIG);
    c.difficulties[0].durations[0].label = " ";
    expect(validateConfig(c)).toMatch(/label/);
    c.difficulties[0].durations[0].label = "1h";
    c.difficulties[0].name = "";
    expect(validateConfig(c)).toMatch(/name/);
    c.difficulties[0].name = "Coastal";
    c.maxShips = 0;
    expect(validateConfig(c)).toMatch(/maxShips/);
  });
});

describe("reward math", () => {
  it("floors the reward to base units", () => {
    expect(computeReward(tokens(100), 10_300)).toBe(tokens(3));
    expect(computeReward(1n, 10_300)).toBe(0n);
    expect(computeReward(tokens(100), 10_000)).toBe(0n);
  });

  it("keeps bigint precision", () => {
    const stake = 123_456_789_012_345_678_901n;
    expect(computePayout(stake, 24_500)).toBe(stake + (stake * 14_500n) / BPS);
  });

  it("computes expected value in bps", () => {
    expect(expectedValueBps(500, 10_300)).toBe(-215);
    expect(expectedValueBps(0, 10_000)).toBe(0);
    expect(expectedValueBps(5_000, 20_000)).toBe(0);
  });
});

describe("rollBps", () => {
  const LIMIT = (1n << 64n) - ((1n << 64n) % BPS);

  function bytesFromU64s(words: bigint[]): Uint8Array {
    const out = new Uint8Array(32);
    words.forEach((w, window) => {
      for (let i = 7; i >= 0; i--) {
        out[window * 8 + i] = Number(w & 0xffn);
        w >>= 8n;
      }
    });
    return out;
  }

  it("maps all-zero bytes to 0", () => {
    expect(rollBps(new Uint8Array(32))).toBe(0);
  });

  it("returns the first window modulo 10000", () => {
    expect(rollBps(bytesFromU64s([123_456_789n, 0n, 0n, 0n]))).toBe(6_789);
  });

  it("falls through a rejected window", () => {
    expect(rollBps(bytesFromU64s([LIMIT, 42n, 0n, 0n]))).toBe(42);
    expect(rollBps(bytesFromU64s([LIMIT + 1n, LIMIT, 7n, 0n]))).toBe(7);
  });

  it("returns null when all four windows are rejected", () => {
    const max = (1n << 64n) - 1n;
    expect(rollBps(bytesFromU64s([max, max, max, max]))).toBeNull();
  });

  it("stays within [0, 9999] on random input", () => {
    for (let n = 0; n < 10_000; n++) {
      const bytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) bytes[i] = Math.floor(Math.random() * 256);
      const roll = rollBps(bytes);
      expect(roll).not.toBeNull();
      expect(roll!).toBeGreaterThanOrEqual(0);
      expect(roll!).toBeLessThanOrEqual(9_999);
    }
  });

  it("throws on short input", () => {
    expect(() => rollBps(new Uint8Array(31))).toThrow();
  });
});

describe("decideOutcome", () => {
  it("never loses at failBps 0", () => {
    expect(decideOutcome(0, 0)).toBe("won");
    expect(decideOutcome(9_999, 0)).toBe("won");
  });

  it("loses on every roll but 9999 at failBps 9999", () => {
    expect(decideOutcome(9_998, 9_999)).toBe("lost");
    expect(decideOutcome(9_999, 9_999)).toBe("won");
  });

  it("wins when roll equals failBps, loses below", () => {
    expect(decideOutcome(500, 500)).toBe("won");
    expect(decideOutcome(499, 500)).toBe("lost");
  });
});

describe("pool accounting", () => {
  const funded: PoolState = { ...ZERO_POOL, available: tokens(1_000) };

  it("reserves at the boundary and not beyond", () => {
    expect(canReserve(funded, tokens(1_000))).toBe(true);
    expect(canReserve(funded, tokens(1_000) + 1n)).toBe(false);
    expect(canReserve(funded, -1n)).toBe(false);
    expect(() => applyReserve(funded, tokens(1_000) + 1n)).toThrow();
  });

  it("release restores a reservation", () => {
    const reserved = applyReserve(funded, tokens(3));
    expect(reserved.available).toBe(tokens(997));
    expect(reserved.reserved).toBe(tokens(3));
    expect(applyReserveRelease(reserved, tokens(3))).toEqual(funded);
  });

  it("settle lost moves stake + reward to available", () => {
    const atSea = applyLaunchConfirmed(
      applyReserve(funded, tokens(3)),
      tokens(100),
    );
    const after = applySettleLost(atSea, tokens(100), tokens(3));
    expect(after).toEqual({
      ...ZERO_POOL,
      available: tokens(1_100),
    });
  });

  it("settle won moves stake + reward to pendingPayouts, paid clears it", () => {
    const atSea = applyLaunchConfirmed(
      applyReserve(funded, tokens(3)),
      tokens(100),
    );
    const won = applySettleWon(atSea, tokens(100), tokens(3));
    expect(won).toEqual({
      ...ZERO_POOL,
      available: tokens(997),
      pendingPayouts: tokens(103),
    });
    expect(applyPaid(won, tokens(103))).toEqual({
      ...ZERO_POOL,
      available: tokens(997),
    });
  });

  it("throws on underflow", () => {
    expect(() => applyPaid(ZERO_POOL, 1n)).toThrow(/underflow/);
    expect(() => applyWithdraw(ZERO_POOL, 1n)).toThrow(/underflow/);
    expect(() => applySettleLost(ZERO_POOL, 1n, 0n)).toThrow(/underflow/);
    expect(() => applyFund(ZERO_POOL, -1n)).toThrow(/negative/);
  });

  it("keeps poolTotal equal to the tracked ledger balance over a random walk", () => {
    let pool = ZERO_POOL;
    let ledger = 0n; // what the canister would hold on the Odin ledger
    const live: { stake: bigint; reward: bigint }[] = [];
    const owed: bigint[] = [];
    for (let step = 0; step < 2_000; step++) {
      const action = Math.floor(Math.random() * 6);
      if (action === 0) {
        const amount = tokens(Math.floor(Math.random() * 500) + 1);
        pool = applyFund(pool, amount);
        ledger += amount;
      } else if (action === 1) {
        const stake = tokens(Math.floor(Math.random() * 100) + 1);
        const reward = computeReward(
          stake,
          10_000 + Math.floor(Math.random() * 15_000),
        );
        if (canReserve(pool, reward)) {
          pool = applyReserve(pool, reward);
          if (Math.random() < 0.2) {
            pool = applyReserveRelease(pool, reward); // pull failed
          } else {
            pool = applyLaunchConfirmed(pool, stake);
            ledger += stake;
            live.push({ stake, reward });
          }
        }
      } else if (action === 2 && live.length > 0) {
        const { stake, reward } = live.pop()!;
        pool = applySettleLost(pool, stake, reward);
      } else if (action === 3 && live.length > 0) {
        const { stake, reward } = live.pop()!;
        pool = applySettleWon(pool, stake, reward);
        owed.push(stake + reward);
      } else if (action === 4 && owed.length > 0) {
        const payout = owed.pop()!;
        pool = applyPaid(pool, payout);
        ledger -= payout;
      } else if (action === 5 && pool.available > 0n) {
        const amount = pool.available / 2n + 1n;
        pool = applyWithdraw(pool, amount);
        ledger -= amount;
      }
      expect(poolTotal(pool)).toBe(ledger);
      for (const v of Object.values(pool)) expect(v).toBeGreaterThanOrEqual(0n);
    }
  });
});

describe("isPristine", () => {
  it("is true only with no ships and an empty pool", () => {
    expect(isPristine(0, ZERO_POOL)).toBe(true);
    expect(isPristine(1, ZERO_POOL)).toBe(false);
    expect(isPristine(0, { ...ZERO_POOL, available: 1n })).toBe(false);
    expect(isPristine(0, { ...ZERO_POOL, pendingPayouts: 1n })).toBe(false);
  });
});

describe("ship guards", () => {
  it("counts only ships at sea against the fleet cap", () => {
    const statuses: ShipStatus[] = [
      "launching",
      "sailing",
      "settling",
      "payout_pending",
      "paying",
      "paid",
      "lost",
    ];
    expect(countAtSea(statuses.map((status) => ship({ status })))).toBe(3);
  });

  it("settles only at or after endsAt", () => {
    const s = ship();
    expect(canSettle(s, s.endsAt - 1n)).toBe(ERR.SHIP_STILL_AT_SEA);
    expect(canSettle(s, s.endsAt)).toBeNull();
  });

  it("re-enters a settling lock only once it is stale", () => {
    const s = ship({ status: "settling", statusChangedAt: 10_000_000n });
    expect(canSettle(s, 10_000_000n + 1_000n)).toBe(
      `${ERR.BAD_STATUS}:settling`,
    );
    expect(canSettle(s, 10_000_000n + 600_000n)).toBeNull();
  });

  it("rejects terminal and payout states", () => {
    expect(canSettle(ship({ status: "paid" }), 1n << 50n)).toBe(
      `${ERR.BAD_STATUS}:paid`,
    );
    expect(canSettle(ship({ status: "payout_pending" }), 1n << 50n)).toBe(
      `${ERR.BAD_STATUS}:payout_pending`,
    );
    expect(canClaim(ship({ status: "payout_pending" }))).toBeNull();
    expect(canClaim(ship({ status: "sailing" }))).toBe(
      `${ERR.BAD_STATUS}:sailing`,
    );
  });

  it("allows only the documented recovery transitions", () => {
    expect(isRecoveryTransition("launching", "sailing")).toBe(true);
    expect(isRecoveryTransition("launching", "lost")).toBe(false);
    expect(isRecoveryTransition("settling", "sailing")).toBe(true);
    expect(isRecoveryTransition("paying", "payout_pending")).toBe(true);
    expect(isRecoveryTransition("paying", "paid")).toBe(true);
    expect(isRecoveryTransition("sailing", "paid")).toBe(false);
    expect(isRecoveryTransition("settling", "lost")).toBe(false);
  });

  it("trims settled ids but never live ones", () => {
    const ships = new Map<bigint, Ship>();
    for (let i = 1n; i <= 10n; i++) {
      ships.set(i, ship({ id: i, status: i % 2n === 0n ? "sailing" : "paid" }));
    }
    const kept = trimOwnerIndex([...ships.keys()], (id) => ships.get(id), 2);
    expect(kept).toEqual([2n, 4n, 6n, 7n, 8n, 9n, 10n]);
  });
});
