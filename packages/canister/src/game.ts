/**
 * Pure game logic — types, config validation, reward math, the outcome roll
 * and the house-pool accounting.
 *
 * This module is intentionally free of any IC/Azle runtime dependency so it
 * can be unit-tested with plain vitest and reasoned about in isolation. The
 * canister (see index.ts) wires these helpers to StableBTreeMaps and to the
 * Odin ledger.
 *
 * ⚠️ AI-GUARD: the pool transition functions below are the accounting core.
 * Every one of them is a pure function that throws on underflow; changing a
 * comparison or dropping a check can pay out tokens the canister does not
 * hold. Add new code AROUND them, never inside, without maintainer sign-off.
 */

// ── Types ─────────────────────────────────────────────────────────────────

export const DIFFICULTIES = [
  "coastal",
  "open_sea",
  "deep_ocean",
  "kraken_waters",
] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const SHIP_STATUSES = [
  "launching",
  "sailing",
  "settling",
  "payout_pending",
  "paying",
  "paid",
  "lost",
] as const;
export type ShipStatus = (typeof SHIP_STATUSES)[number];

export type Outcome = "won" | "lost";

export interface DurationOption {
  /** Voyage length in milliseconds. */
  durationMs: bigint;
  /** Chance of losing the whole stake, in basis points of 10 000. */
  failBps: number;
  /** Payout on success as basis points of the stake (10 000 = stake back). */
  multiplierBps: number;
  /** Short display label, e.g. "1h", "3d". */
  label: string;
}

export interface DifficultyConfig {
  difficulty: Difficulty;
  name: string;
  /** Fixed stake in base units. Every launch of this difficulty stakes this. */
  stake: bigint;
  durations: DurationOption[];
}

export interface GameConfig {
  difficulties: DifficultyConfig[];
  /** Max ships a player may have at sea at once. */
  maxShips: number;
}

export interface Ship {
  id: bigint;
  /** Owner principal text. */
  owner: string;
  difficulty: Difficulty;
  durationIndex: number;
  /** Snapshots taken at launch: `set_config` never affects a ship at sea. */
  stake: bigint;
  durationMs: bigint;
  multiplierBps: number;
  failBps: number;
  /** Reward reserved from the pool at launch (payout - stake). */
  reservedReward: bigint;
  /** Milliseconds since epoch. 0 until the stake pull has settled. */
  startedAt: bigint;
  endsAt: bigint;
  status: ShipStatus;
  /** stake + reservedReward once won, else 0. */
  payout: bigint;
  outcome: Outcome | null;
  roll: number | null;
  settledAt: bigint | null;
  paidAt: bigint | null;
  /** When `status` last changed — used to detect a stuck lock. */
  statusChangedAt: bigint;
}

/**
 * House pool accounting, all in base units of the game token. The invariant
 * `poolTotal(pool) == canister's token balance on the Odin ledger` holds
 * between calls (pulls/sends in flight excepted).
 */
export interface PoolState {
  /** Free to reserve for new launches or withdraw by the admin. */
  available: bigint;
  /** Rewards promised to ships at sea. */
  reserved: bigint;
  /** Stakes of ships at sea. */
  activeStakes: bigint;
  /** Won payouts not yet transferred out. */
  pendingPayouts: bigint;
}

export const ZERO_POOL: PoolState = {
  available: 0n,
  reserved: 0n,
  activeStakes: 0n,
  pendingPayouts: 0n,
};

// ── Constants ─────────────────────────────────────────────────────────────

export const BPS = 10_000n;
export const MIN_DURATION_MS = 60_000n;
export const MAX_DURATION_MS = 30n * 24n * 60n * 60n * 1000n;
export const MAX_DURATIONS_PER_DIFFICULTY = 8;
export const MIN_MULTIPLIER_BPS = 10_000;
export const MAX_MULTIPLIER_BPS = 1_000_000;
export const MAX_FAIL_BPS = 9_999;
/** Amounts are ICRC-1 `Nat`; cap at 2^256-1 to reject absurd inputs. */
export const MAX_AMOUNT = (1n << 256n) - 1n;
/** A `settling` lock older than this may be re-entered (see `canSettle`). */
export const STUCK_SETTLE_MS = 10n * 60n * 1000n;

/** Stable error codes returned in `Err` — the frontend matches on these. */
export const ERR = {
  ANONYMOUS: "ANONYMOUS",
  PAUSED: "PAUSED",
  UNKNOWN_DIFFICULTY: "UNKNOWN_DIFFICULTY",
  BAD_DURATION_INDEX: "BAD_DURATION_INDEX",
  FLEET_FULL: "FLEET_FULL",
  POOL_INSUFFICIENT: "POOL_INSUFFICIENT",
  PULL_FAILED: "PULL_FAILED",
  SHIP_NOT_FOUND: "SHIP_NOT_FOUND",
  NOT_OWNER: "NOT_OWNER",
  SHIP_STILL_AT_SEA: "SHIP_STILL_AT_SEA",
  BAD_STATUS: "BAD_STATUS",
  RAND_UNAVAILABLE: "RAND_UNAVAILABLE",
  PAYOUT_FAILED: "PAYOUT_FAILED",
  NOT_ADMIN: "NOT_ADMIN",
  INVALID_CONFIG: "INVALID_CONFIG",
  INVALID_AMOUNT: "INVALID_AMOUNT",
  BAD_TRANSITION: "BAD_TRANSITION",
  NOT_PRISTINE: "NOT_PRISTINE",
} as const;

// ── Validation ────────────────────────────────────────────────────────────

/** Reject zero, negative and absurdly large amounts. Throws on failure. */
export function validateAmount(amount: bigint): void {
  if (typeof amount !== "bigint") {
    throw new Error(`${ERR.INVALID_AMOUNT}: not a bigint`);
  }
  if (amount <= 0n) {
    throw new Error(`${ERR.INVALID_AMOUNT}: must be positive`);
  }
  if (amount > MAX_AMOUNT) {
    throw new Error(`${ERR.INVALID_AMOUNT}: exceeds maximum`);
  }
}

/** Returns a reason string when `config` is invalid, else null. */
export function validateConfig(config: GameConfig): string | null {
  if (!Number.isInteger(config.maxShips) || config.maxShips < 1) {
    return "maxShips must be a positive integer";
  }
  if (config.maxShips > 50) {
    return "maxShips must be at most 50";
  }
  const seen = new Set<Difficulty>();
  for (const tier of config.difficulties) {
    if (!(DIFFICULTIES as readonly string[]).includes(tier.difficulty)) {
      return `unknown difficulty ${String(tier.difficulty)}`;
    }
    if (seen.has(tier.difficulty)) {
      return `duplicate difficulty ${tier.difficulty}`;
    }
    seen.add(tier.difficulty);
    if (tier.name.trim() === "") {
      return `${tier.difficulty}: name must be non-empty`;
    }
    if (typeof tier.stake !== "bigint" || tier.stake <= 0n) {
      return `${tier.difficulty}: stake must be positive`;
    }
    if (tier.stake > MAX_AMOUNT) {
      return `${tier.difficulty}: stake exceeds maximum`;
    }
    if (
      tier.durations.length < 1 ||
      tier.durations.length > MAX_DURATIONS_PER_DIFFICULTY
    ) {
      return `${tier.difficulty}: must have 1..${MAX_DURATIONS_PER_DIFFICULTY} durations`;
    }
    for (const [i, option] of tier.durations.entries()) {
      const where = `${tier.difficulty}[${i}]`;
      if (
        typeof option.durationMs !== "bigint" ||
        option.durationMs < MIN_DURATION_MS ||
        option.durationMs > MAX_DURATION_MS
      ) {
        return `${where}: durationMs must be between ${MIN_DURATION_MS} and ${MAX_DURATION_MS}`;
      }
      if (
        !Number.isInteger(option.failBps) ||
        option.failBps < 0 ||
        option.failBps > MAX_FAIL_BPS
      ) {
        return `${where}: failBps must be 0..${MAX_FAIL_BPS}`;
      }
      if (
        !Number.isInteger(option.multiplierBps) ||
        option.multiplierBps < MIN_MULTIPLIER_BPS ||
        option.multiplierBps > MAX_MULTIPLIER_BPS
      ) {
        return `${where}: multiplierBps must be ${MIN_MULTIPLIER_BPS}..${MAX_MULTIPLIER_BPS}`;
      }
      if (option.label.trim() === "") {
        return `${where}: label must be non-empty`;
      }
    }
  }
  for (const difficulty of DIFFICULTIES) {
    if (!seen.has(difficulty)) {
      return `missing difficulty ${difficulty}`;
    }
  }
  return null;
}

export function findDifficulty(
  config: GameConfig,
  difficulty: Difficulty,
): DifficultyConfig | undefined {
  return config.difficulties.find((d) => d.difficulty === difficulty);
}

// ── Reward math ───────────────────────────────────────────────────────────

/** Reward on top of the stake, floored to base units. */
export function computeReward(stake: bigint, multiplierBps: number): bigint {
  return (stake * BigInt(multiplierBps - MIN_MULTIPLIER_BPS)) / BPS;
}

export function computePayout(stake: bigint, multiplierBps: number): bigint {
  return stake + computeReward(stake, multiplierBps);
}

/**
 * Player's expected value per launch in basis points of the stake (negative
 * means the house keeps that share on average).
 */
export function expectedValueBps(
  failBps: number,
  multiplierBps: number,
): number {
  return Math.floor(((10_000 - failBps) * multiplierBps) / 10_000) - 10_000;
}

// ── Outcome roll ──────────────────────────────────────────────────────────

const U64 = 1n << 64n;
/** Largest multiple of 10 000 that fits in a u64; values above are rejected. */
const ROLL_LIMIT = U64 - (U64 % BPS);

/**
 * Turn 32 bytes of `raw_rand` output into an unbiased roll in [0, 9999].
 *
 * Each disjoint 8-byte window is read as a big-endian u64; a window is
 * accepted when it is below `ROLL_LIMIT` (rejection sampling, so every roll
 * value is exactly equiprobable). Rejection of one window has probability
 * 1616 / 2^64, so `null` (all four rejected) is effectively unreachable, but
 * the canister still handles it by re-requesting randomness.
 */
export function rollBps(bytes: Uint8Array): number | null {
  if (bytes.length < 32) {
    throw new Error("rollBps needs at least 32 bytes of randomness");
  }
  for (let window = 0; window < 4; window++) {
    let v = 0n;
    for (let i = 0; i < 8; i++) {
      v = (v << 8n) | BigInt(bytes[window * 8 + i]);
    }
    if (v < ROLL_LIMIT) {
      return Number(v % BPS);
    }
  }
  return null;
}

/** Exactly `failBps` of the 10 000 equiprobable roll values lose. */
export function decideOutcome(roll: number, failBps: number): Outcome {
  return roll < failBps ? "lost" : "won";
}

// ── Pool accounting ───────────────────────────────────────────────────────
// ── BEGIN HARDENED POOL CORE ──

function sub(a: bigint, b: bigint, what: string): bigint {
  if (b < 0n) {
    throw new Error(`pool: negative ${what}`);
  }
  if (a < b) {
    throw new Error(`pool: ${what} underflow`);
  }
  return a - b;
}

function add(a: bigint, b: bigint, what: string): bigint {
  if (b < 0n) {
    throw new Error(`pool: negative ${what}`);
  }
  return a + b;
}

export function poolTotal(pool: PoolState): bigint {
  return (
    pool.available + pool.reserved + pool.activeStakes + pool.pendingPayouts
  );
}

/** Can the pool promise `reward` to a new ship? */
export function canReserve(pool: PoolState, reward: bigint): boolean {
  return reward >= 0n && pool.available >= reward;
}

/** Launch (before the stake pull): promise `reward` out of `available`. */
export function applyReserve(pool: PoolState, reward: bigint): PoolState {
  if (!canReserve(pool, reward)) {
    throw new Error(`pool: cannot reserve ${reward}`);
  }
  return {
    ...pool,
    available: sub(pool.available, reward, "reserve"),
    reserved: add(pool.reserved, reward, "reserve"),
  };
}

/** Launch aborted (stake pull failed): give the promise back. */
export function applyReserveRelease(
  pool: PoolState,
  reward: bigint,
): PoolState {
  return {
    ...pool,
    reserved: sub(pool.reserved, reward, "reserved"),
    available: add(pool.available, reward, "reserve release"),
  };
}

/** Launch confirmed (stake pulled): the stake is now held for the ship. */
export function applyLaunchConfirmed(
  pool: PoolState,
  stake: bigint,
): PoolState {
  return { ...pool, activeStakes: add(pool.activeStakes, stake, "stake") };
}

/** Ship lost: stake and the released reward both become house money. */
export function applySettleLost(
  pool: PoolState,
  stake: bigint,
  reward: bigint,
): PoolState {
  return {
    ...pool,
    reserved: sub(pool.reserved, reward, "reserved"),
    activeStakes: sub(pool.activeStakes, stake, "activeStakes"),
    available: add(pool.available, stake + reward, "settle lost"),
  };
}

/** Ship won: stake + reward are now owed to the owner. */
export function applySettleWon(
  pool: PoolState,
  stake: bigint,
  reward: bigint,
): PoolState {
  return {
    ...pool,
    reserved: sub(pool.reserved, reward, "reserved"),
    activeStakes: sub(pool.activeStakes, stake, "activeStakes"),
    pendingPayouts: add(pool.pendingPayouts, stake + reward, "settle won"),
  };
}

/** Payout transferred out. */
export function applyPaid(pool: PoolState, payout: bigint): PoolState {
  return {
    ...pool,
    pendingPayouts: sub(pool.pendingPayouts, payout, "pendingPayouts"),
  };
}

/** Admin (or donor) deposit settled. */
export function applyFund(pool: PoolState, amount: bigint): PoolState {
  return { ...pool, available: add(pool.available, amount, "fund") };
}

/** Admin withdrawal of free pool money. */
export function applyWithdraw(pool: PoolState, amount: bigint): PoolState {
  return { ...pool, available: sub(pool.available, amount, "available") };
}

// ── END HARDENED POOL CORE ──

/**
 * The ledger and token may only change while the canister holds nothing:
 * every stake, reservation and payout lives on the current ledger under the
 * current token's subaccount, so switching with funds present would orphan
 * them. "Nothing" means no ship was ever launched and the pool is empty.
 */
export function isPristine(shipCount: number, pool: PoolState): boolean {
  return shipCount === 0 && poolTotal(pool) === 0n;
}

// ── Ship state guards ─────────────────────────────────────────────────────

/** Statuses that count against the fleet cap. */
export function isAtSea(status: ShipStatus): boolean {
  return (
    status === "launching" || status === "sailing" || status === "settling"
  );
}

/** Terminal statuses. */
export function isSettled(status: ShipStatus): boolean {
  return status === "paid" || status === "lost";
}

export function countAtSea(ships: Iterable<Ship>): number {
  let n = 0;
  for (const ship of ships) {
    if (isAtSea(ship.status)) n++;
  }
  return n;
}

/**
 * Error code when `ship` cannot be settled now, else null. A `settling` lock
 * older than `stuckMs` is re-enterable: no outcome was recorded for it, so
 * re-rolling cannot double-settle.
 */
export function canSettle(
  ship: Ship,
  nowMs: bigint,
  stuckMs: bigint = STUCK_SETTLE_MS,
): string | null {
  if (ship.status === "settling") {
    if (nowMs - ship.statusChangedAt < stuckMs) {
      return `${ERR.BAD_STATUS}:settling`;
    }
  } else if (ship.status !== "sailing") {
    return `${ERR.BAD_STATUS}:${ship.status}`;
  }
  if (nowMs < ship.endsAt) {
    return ERR.SHIP_STILL_AT_SEA;
  }
  return null;
}

export function canClaim(ship: Ship): string | null {
  if (ship.status !== "payout_pending") {
    return `${ERR.BAD_STATUS}:${ship.status}`;
  }
  return null;
}

/** Admin recovery transitions allowed for a manually verified stuck ship. */
export function isRecoveryTransition(
  from: ShipStatus,
  to: ShipStatus,
): boolean {
  if (from === "settling") return to === "sailing";
  if (from === "paying") return to === "payout_pending" || to === "paid";
  return false;
}

/**
 * Keep an owner's index bounded: every ship at sea or awaiting payout stays,
 * and only the newest `keep` settled ids are retained.
 */
export function trimOwnerIndex(
  ids: readonly bigint[],
  lookup: (id: bigint) => Ship | undefined,
  keep: number,
): bigint[] {
  const settled: bigint[] = [];
  const live: bigint[] = [];
  for (const id of ids) {
    const ship = lookup(id);
    if (ship === undefined) continue;
    (isSettled(ship.status) ? settled : live).push(id);
  }
  const keptSettled = settled.slice(Math.max(0, settled.length - keep));
  return [...live, ...keptSettled].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
