import { IDL } from "@dfinity/candid";
import type { Principal } from "@dfinity/principal";
import type { ActorMethod } from "@dfinity/agent";

/**
 * Candid interface for the game canister (`packages/canister`). Kept in sync
 * by hand with the generated `.azle/canister/canister.did` (run
 * `pnpm build:canister` and diff). Every Candid-shape assumption the app
 * makes lives in this file.
 *
 * Numeric widths: `nat` / `nat64` decode to `bigint`, `nat8/16/32` to
 * `number`, `opt T` to `[] | [T]`. Timestamps are milliseconds since epoch.
 */

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

/** Candid unit variant, e.g. `{ coastal: null }`. */
type UnitVariant<K extends string> = { [P in K]: { [Q in P]: null } }[K];
export type CandidDifficulty = UnitVariant<Difficulty>;
export type CandidShipStatus = UnitVariant<ShipStatus>;
export type CandidOutcome = UnitVariant<"won" | "lost">;

function variantKey<K extends string>(
  value: Record<string, unknown>,
  keys: readonly K[],
): K {
  for (const key of keys) {
    if (key in value) return key;
  }
  throw new Error(`unknown variant: ${Object.keys(value).join(",")}`);
}

export function toCandidDifficulty(d: Difficulty): CandidDifficulty {
  return { [d]: null } as CandidDifficulty;
}

export function fromCandidDifficulty(v: CandidDifficulty): Difficulty {
  return variantKey(v, DIFFICULTIES);
}

export function fromCandidShipStatus(v: CandidShipStatus): ShipStatus {
  return variantKey(v, SHIP_STATUSES);
}

export interface DurationOption {
  durationMs: bigint;
  failBps: number;
  multiplierBps: number;
  label: string;
}

export interface DifficultyConfig {
  difficulty: CandidDifficulty;
  name: string;
  stake: bigint;
  durations: DurationOption[];
}

export interface GameConfig {
  difficulties: DifficultyConfig[];
  maxShips: number;
}

export interface Ship {
  id: bigint;
  owner: Principal;
  difficulty: CandidDifficulty;
  durationIndex: number;
  stake: bigint;
  durationMs: bigint;
  multiplierBps: number;
  failBps: number;
  reservedReward: bigint;
  startedAt: bigint;
  endsAt: bigint;
  status: CandidShipStatus;
  payout: bigint;
  outcome: [] | [CandidOutcome];
  roll: [] | [number];
  settledAt: [] | [bigint];
  paidAt: [] | [bigint];
}

export interface PoolStats {
  available: bigint;
  reserved: bigint;
  activeStakes: bigint;
  pendingPayouts: bigint;
  total: bigint;
}

export type SettleOutcome =
  { won: { payout: bigint; paid: boolean } } | { lost: { stakeLost: bigint } };

export type Result<T> = { Ok: T } | { Err: string };

export interface GameCanister {
  launch: ActorMethod<[CandidDifficulty, number], Result<bigint>>;
  settle: ActorMethod<[bigint], Result<SettleOutcome>>;
  claim: ActorMethod<[bigint], Result<bigint>>;
  get_my_ships: ActorMethod<[], Ship[]>;
  get_ship: ActorMethod<[bigint], [] | [Ship]>;
  get_config: ActorMethod<[], GameConfig>;
  get_pool_stats: ActorMethod<[], PoolStats>;
  get_version: ActorMethod<[], string>;
}

function unitVariant(keys: readonly string[]): IDL.VariantClass {
  return IDL.Variant(Object.fromEntries(keys.map((k) => [k, IDL.Null])));
}

export const idlFactory: IDL.InterfaceFactory = ({ IDL }) => {
  const Difficulty = unitVariant(DIFFICULTIES);
  const ShipStatus = unitVariant(SHIP_STATUSES);
  const Outcome = unitVariant(["won", "lost"]);
  const DurationOption = IDL.Record({
    durationMs: IDL.Nat64,
    failBps: IDL.Nat16,
    multiplierBps: IDL.Nat32,
    label: IDL.Text,
  });
  const DifficultyConfig = IDL.Record({
    difficulty: Difficulty,
    name: IDL.Text,
    stake: IDL.Nat,
    durations: IDL.Vec(DurationOption),
  });
  const GameConfig = IDL.Record({
    difficulties: IDL.Vec(DifficultyConfig),
    maxShips: IDL.Nat8,
  });
  const Ship = IDL.Record({
    id: IDL.Nat64,
    owner: IDL.Principal,
    difficulty: Difficulty,
    durationIndex: IDL.Nat8,
    stake: IDL.Nat,
    durationMs: IDL.Nat64,
    multiplierBps: IDL.Nat32,
    failBps: IDL.Nat16,
    reservedReward: IDL.Nat,
    startedAt: IDL.Nat64,
    endsAt: IDL.Nat64,
    status: ShipStatus,
    payout: IDL.Nat,
    outcome: IDL.Opt(Outcome),
    roll: IDL.Opt(IDL.Nat16),
    settledAt: IDL.Opt(IDL.Nat64),
    paidAt: IDL.Opt(IDL.Nat64),
  });
  const PoolStats = IDL.Record({
    available: IDL.Nat,
    reserved: IDL.Nat,
    activeStakes: IDL.Nat,
    pendingPayouts: IDL.Nat,
    total: IDL.Nat,
  });
  const SettleOutcome = IDL.Variant({
    won: IDL.Record({ payout: IDL.Nat, paid: IDL.Bool }),
    lost: IDL.Record({ stakeLost: IDL.Nat }),
  });
  const Result = (ok: IDL.Type) => IDL.Variant({ Ok: ok, Err: IDL.Text });

  return IDL.Service({
    launch: IDL.Func([Difficulty, IDL.Nat8], [Result(IDL.Nat64)], []),
    settle: IDL.Func([IDL.Nat64], [Result(SettleOutcome)], []),
    claim: IDL.Func([IDL.Nat64], [Result(IDL.Nat)], []),
    get_my_ships: IDL.Func([], [IDL.Vec(Ship)], ["query"]),
    get_ship: IDL.Func([IDL.Nat64], [IDL.Opt(Ship)], ["query"]),
    get_config: IDL.Func([], [GameConfig], ["query"]),
    get_pool_stats: IDL.Func([], [PoolStats], ["query"]),
    get_version: IDL.Func([], [IDL.Text], ["query"]),
  });
};
