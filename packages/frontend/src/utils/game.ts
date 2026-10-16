import {
  fromCandidDifficulty,
  fromCandidShipStatus,
  type GameConfig,
  type Ship,
  type ShipStatus,
} from "../canister/idl";
import { OdinUtils } from "odin-connect";
import type { TokenUnits } from "../contexts/useWallet";
import type { Tier } from "./rewards";

/** One duration option as the UI uses it. */
export interface DurationChoice {
  index: number;
  label: string;
  durationMs: number;
  failBps: number;
  multiplierBps: number;
}

export interface TierRules {
  name: string;
  /** Fixed stake in base units. */
  stake: bigint;
  durations: DurationChoice[];
}

/** `get_config` reshaped for rendering: difficulties keyed by tier. */
export interface GameRules {
  maxShips: number;
  tiers: Record<Tier, TierRules>;
}

export function parseGameConfig(config: GameConfig): GameRules {
  const tiers = {} as Record<Tier, TierRules>;
  for (const d of config.difficulties) {
    tiers[fromCandidDifficulty(d.difficulty)] = {
      name: d.name,
      stake: d.stake,
      durations: d.durations.map((o, index) => ({
        index,
        label: o.label,
        durationMs: Number(o.durationMs),
        failBps: o.failBps,
        multiplierBps: o.multiplierBps,
      })),
    };
  }
  return { maxShips: config.maxShips, tiers };
}

/** A ship at sea or awaiting its payout. */
export interface Expedition {
  /** `ship.id` as text — React key and dispatch id. */
  id: string;
  shipId: bigint;
  tier: Tier;
  /** Base units. */
  stake: bigint;
  /** Base units, on top of the stake. */
  reward: bigint;
  durationMs: number;
  startedAt: number;
  endsAt: number;
  failBps: number;
  multiplierBps: number;
  status: ShipStatus;
}

/** A settled ship: voyage log entry and reward toast. */
export interface CompletedExpedition {
  id: string;
  tier: Tier;
  stake: bigint;
  succeeded: boolean;
  /** Base units received (stake + reward), 0 when lost. */
  payout: bigint;
  completedAt: number;
}

export interface DispatchedExpedition {
  id: string;
  tier: Tier;
  stake: bigint;
}

export interface GameState {
  /** Display balance in whole tokens. */
  balance: number;
  /** Balance in base units — what stake checks compare against. */
  balanceUnits: bigint;
  rules: GameRules | null;
  activeExpeditions: Expedition[];
  completedExpeditions: CompletedExpedition[];
  pendingReturns: CompletedExpedition[];
  pendingDispatches: DispatchedExpedition[];
}

export const INITIAL_GAME_STATE: GameState = {
  balance: 0,
  balanceUnits: 0n,
  rules: null,
  activeExpeditions: [],
  completedExpeditions: [],
  pendingReturns: [],
  pendingDispatches: [],
};

export type GameAction =
  | { type: "SET_RULES"; payload: GameRules }
  | { type: "SET_BALANCE"; payload: { balance: number; balanceUnits: bigint } }
  | { type: "SYNC_SHIPS"; payload: Ship[] }
  | { type: "SHIP_LAUNCHED"; payload: DispatchedExpedition }
  | { type: "SHIP_RETURNED"; payload: CompletedExpedition }
  | { type: "DISMISS_RETURN"; payload: { id: string } }
  | { type: "DISMISS_DISPATCH"; payload: { id: string } };

/** Ships the fleet still shows: not yet settled, or won but unpaid. */
export function isActiveStatus(status: ShipStatus): boolean {
  return status !== "paid" && status !== "lost";
}

export function shipToExpedition(ship: Ship): Expedition {
  return {
    id: ship.id.toString(),
    shipId: ship.id,
    tier: fromCandidDifficulty(ship.difficulty),
    stake: ship.stake,
    reward: ship.reservedReward,
    durationMs: Number(ship.durationMs),
    startedAt: Number(ship.startedAt),
    endsAt: Number(ship.endsAt),
    failBps: ship.failBps,
    multiplierBps: ship.multiplierBps,
    status: fromCandidShipStatus(ship.status),
  };
}

export function shipToCompleted(ship: Ship): CompletedExpedition {
  const status = fromCandidShipStatus(ship.status);
  const succeeded = status !== "lost";
  return {
    id: ship.id.toString(),
    tier: fromCandidDifficulty(ship.difficulty),
    stake: ship.stake,
    succeeded,
    payout: succeeded ? ship.payout : 0n,
    completedAt: Number(ship.settledAt[0] ?? ship.endsAt),
  };
}

/**
 * A user-typed token amount ("12.5") as base units, or null when it is not a
 * plain positive decimal. Exponent forms, signs and blanks are rejected here
 * because the SDK's converter would throw (or return 0) on them. Extra
 * fraction digits beyond the token's precision are truncated.
 */
export function parseTokenAmount(
  text: string,
  token: TokenUnits,
): bigint | null {
  const trimmed = text.trim();
  if (!/^[0-9]+(\.[0-9]+)?$/.test(trimmed)) return null;
  const amount = OdinUtils.convertToOdinAmount(trimmed, token);
  return amount > 0n ? amount : null;
}
