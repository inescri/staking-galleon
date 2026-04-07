import { TIER_CONFIGS, type Tier } from "./rewards";
import type { StakingPosition } from "../canister/staking.did";

const TOKEN_DECIMALS = 3;
const TOKEN_DIVISIBILITY = 8;
const TOKEN_DIVISOR = Math.pow(10, TOKEN_DIVISIBILITY + TOKEN_DECIMALS);

function inferTier(durationMs: number): Tier {
  const durationSec = durationMs / 1000;
  const tiers: Tier[] = ["kraken_waters", "deep_ocean", "open_sea", "coastal"];
  for (const tier of tiers) {
    if (durationSec >= TIER_CONFIGS[tier].minDuration) return tier;
  }
  return "coastal";
}

export function stakingPositionToExpedition(pos: StakingPosition): Expedition {
  const durationMs = Number(pos.initialDuration);
  const startedAt = Number(pos.lockStart);
  const stakeAmount = Number(pos.stakedAmount) / TOKEN_DIVISOR;
  const tier = inferTier(durationMs);
  return {
    id: `${pos.tokenId}:${pos.user}`,
    stakeAmount,
    durationMs,
    startedAt,
    tier,
  };
}

export interface Expedition {
  id: string;
  stakeAmount: number;
  durationMs: number;
  startedAt: number;
  tier: Tier;
}

export interface CompletedExpedition {
  id: string;
  stakeAmount: number;
  tier: Tier;
  completedAt: number;
}

export interface DispatchedExpedition {
  id: string;
  stakeAmount: number;
  tier: Tier;
}

export interface GameState {
  balance: number;
  activeExpeditions: Expedition[];
  completedExpeditions: CompletedExpedition[];
  pendingReturns: CompletedExpedition[];
  pendingDispatches: DispatchedExpedition[];
}

export type GameAction =
  | {
      type: "LAUNCH_EXPEDITION";
      payload: { id: string; stakeAmount: number; durationMs: number; tier: Tier };
    }
  | { type: "RETURN_EXPEDITION"; payload: { id: string } }
  | { type: "DISMISS_RETURN"; payload: { id: string } }
  | { type: "DISMISS_DISPATCH"; payload: { id: string } }
  | { type: "EXTEND_EXPEDITION"; payload: { id: string; additionalDurationMs: number } }
  | { type: "SET_BALANCE"; payload: number }
  | { type: "LOAD_STATE"; payload: GameState }
  | { type: "SYNC_POSITIONS"; payload: StakingPosition[] };

export { inferTier };
