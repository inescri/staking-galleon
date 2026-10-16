import { IDL } from "azle";
import type { Principal } from "@dfinity/principal";

import {
  DIFFICULTIES,
  SHIP_STATUSES,
  type Difficulty,
  type DifficultyConfig,
  type DurationOption,
  type GameConfig,
  type Outcome,
  type Ship,
  type ShipStatus,
} from "./game";

/**
 * Candid (IDL) mirrors of the pure `game.ts` types, plus the converters
 * between the canister's internal records and their Candid wire shape:
 *   - string unions ↔ Candid variants `{ coastal: null }`
 *   - `T | null`    ↔ Candid `opt` as `[] | [T]`
 *   - owner text    ↔ `principal`
 */

function nullVariant<const K extends readonly string[]>(
  keys: K,
): IDL.VariantClass {
  return IDL.Variant(Object.fromEntries(keys.map((k) => [k, IDL.Null])));
}

type UnitVariant<K extends string> = { [P in K]: null };

function toVariant<K extends string>(key: K): UnitVariant<K> {
  return { [key]: null } as UnitVariant<K>;
}

function fromVariant<K extends string>(
  value: Record<string, unknown>,
  keys: readonly K[],
): K {
  for (const k of keys) {
    if (k in value) return k;
  }
  throw new Error(`unknown variant ${JSON.stringify(Object.keys(value))}`);
}

// ── Difficulty / status / outcome ────────────────────────────────────────

export const DifficultyIdl = nullVariant(DIFFICULTIES);
export type CandidDifficulty = UnitVariant<Difficulty>;
export const toCandidDifficulty = (d: Difficulty): CandidDifficulty =>
  toVariant(d);
export const fromCandidDifficulty = (v: CandidDifficulty): Difficulty =>
  fromVariant(v, DIFFICULTIES);

export const ShipStatusIdl = nullVariant(SHIP_STATUSES);
export type CandidShipStatus = UnitVariant<ShipStatus>;
export const toCandidShipStatus = (s: ShipStatus): CandidShipStatus =>
  toVariant(s);
export const fromCandidShipStatus = (v: CandidShipStatus): ShipStatus =>
  fromVariant(v, SHIP_STATUSES);

const OUTCOMES = ["won", "lost"] as const;
export const OutcomeIdl = nullVariant(OUTCOMES);
export type CandidOutcome = UnitVariant<Outcome>;

// ── Config ───────────────────────────────────────────────────────────────

export const DurationOptionIdl = IDL.Record({
  durationMs: IDL.Nat64,
  failBps: IDL.Nat16,
  multiplierBps: IDL.Nat32,
  label: IDL.Text,
});

export const DifficultyConfigIdl = IDL.Record({
  difficulty: DifficultyIdl,
  name: IDL.Text,
  stake: IDL.Nat,
  durations: IDL.Vec(DurationOptionIdl),
});

export const GameConfigIdl = IDL.Record({
  difficulties: IDL.Vec(DifficultyConfigIdl),
  maxShips: IDL.Nat8,
});

export interface CandidDifficultyConfig {
  difficulty: CandidDifficulty;
  name: string;
  stake: bigint;
  durations: DurationOption[];
}

export interface CandidGameConfig {
  difficulties: CandidDifficultyConfig[];
  maxShips: number;
}

export function toCandidConfig(config: GameConfig): CandidGameConfig {
  return {
    maxShips: config.maxShips,
    difficulties: config.difficulties.map((d) => ({
      difficulty: toCandidDifficulty(d.difficulty),
      name: d.name,
      stake: d.stake,
      durations: d.durations.map((o) => ({ ...o })),
    })),
  };
}

export function fromCandidConfig(config: CandidGameConfig): GameConfig {
  return {
    maxShips: config.maxShips,
    difficulties: config.difficulties.map((d): DifficultyConfig => ({
      difficulty: fromCandidDifficulty(d.difficulty),
      name: d.name,
      stake: d.stake,
      durations: d.durations.map((o) => ({ ...o })),
    })),
  };
}

// ── Ship ─────────────────────────────────────────────────────────────────

export const ShipIdl = IDL.Record({
  id: IDL.Nat64,
  owner: IDL.Principal,
  difficulty: DifficultyIdl,
  durationIndex: IDL.Nat8,
  stake: IDL.Nat,
  durationMs: IDL.Nat64,
  multiplierBps: IDL.Nat32,
  failBps: IDL.Nat16,
  reservedReward: IDL.Nat,
  startedAt: IDL.Nat64,
  endsAt: IDL.Nat64,
  status: ShipStatusIdl,
  payout: IDL.Nat,
  outcome: IDL.Opt(OutcomeIdl),
  roll: IDL.Opt(IDL.Nat16),
  settledAt: IDL.Opt(IDL.Nat64),
  paidAt: IDL.Opt(IDL.Nat64),
});

export interface CandidShip {
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

export function toCandidShip(
  ship: Ship,
  principalFromText: (text: string) => Principal,
): CandidShip {
  return {
    id: ship.id,
    owner: principalFromText(ship.owner),
    difficulty: toCandidDifficulty(ship.difficulty),
    durationIndex: ship.durationIndex,
    stake: ship.stake,
    durationMs: ship.durationMs,
    multiplierBps: ship.multiplierBps,
    failBps: ship.failBps,
    reservedReward: ship.reservedReward,
    startedAt: ship.startedAt,
    endsAt: ship.endsAt,
    status: toCandidShipStatus(ship.status),
    payout: ship.payout,
    outcome: ship.outcome === null ? [] : [toVariant(ship.outcome)],
    roll: ship.roll === null ? [] : [ship.roll],
    settledAt: ship.settledAt === null ? [] : [ship.settledAt],
    paidAt: ship.paidAt === null ? [] : [ship.paidAt],
  };
}

// ── Pool / results ───────────────────────────────────────────────────────

export const PoolStatsIdl = IDL.Record({
  available: IDL.Nat,
  reserved: IDL.Nat,
  activeStakes: IDL.Nat,
  pendingPayouts: IDL.Nat,
  total: IDL.Nat,
});

export const SettleOutcomeIdl = IDL.Variant({
  won: IDL.Record({ payout: IDL.Nat, paid: IDL.Bool }),
  lost: IDL.Record({ stakeLost: IDL.Nat }),
});

export type SettleOutcome =
  { won: { payout: bigint; paid: boolean } } | { lost: { stakeLost: bigint } };

export function ResultIdl(ok: IDL.Type): IDL.VariantClass {
  return IDL.Variant({ Ok: ok, Err: IDL.Text });
}

export type Result<T> = { Ok: T } | { Err: string };

export const InitArgsIdl = IDL.Record({
  ledger_id: IDL.Principal,
  token_id: IDL.Text,
});

export interface InitArgs {
  ledger_id: Principal;
  token_id: string;
}

export const TrustedOriginsIdl = IDL.Record({
  trusted_origins: IDL.Vec(IDL.Text),
});
