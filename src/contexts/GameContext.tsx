import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
  type Dispatch,
} from "react";
import { calculateReward, TIER_CONFIGS, type Tier } from "../utils/rewards";
import { saveGameState, loadGameState } from "../utils/persistence";
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
    id: `onchain-${pos.tokenId}`,
    stakeAmount,
    durationMs,
    startedAt,
    tier,
    reward: calculateReward(stakeAmount, durationMs, tier),
  };
}

export interface Expedition {
  id: string;
  stakeAmount: number;
  durationMs: number;
  startedAt: number;
  tier: Tier;
  reward: number; // pre-calculated at launch
}

export interface CompletedExpedition {
  id: string;
  stakeAmount: number;
  reward: number;
  tier: Tier;
  completedAt: number;
}

export interface GameState {
  balance: number;
  activeExpeditions: Expedition[];
  completedExpeditions: CompletedExpedition[];
  pendingReturns: CompletedExpedition[];
}

export type GameAction =
  | {
      type: "LAUNCH_EXPEDITION";
      payload: { stakeAmount: number; durationMs: number; tier: Tier };
    }
  | { type: "COMPLETE_EXPEDITION"; payload: { id: string } }
  | { type: "RETURN_EXPEDITION"; payload: { id: string } }
  | { type: "DISMISS_RETURN"; payload: { id: string } }
  | { type: "SET_BALANCE"; payload: number }
  | { type: "LOAD_STATE"; payload: GameState }
  | { type: "SYNC_POSITIONS"; payload: StakingPosition[] };

const MAX_EXPEDITIONS = 5;

const INITIAL_STATE: GameState = {
  balance: 1000,
  activeExpeditions: [],
  completedExpeditions: [],
  pendingReturns: [],
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "LAUNCH_EXPEDITION": {
      const { stakeAmount, durationMs, tier } = action.payload;
      if (stakeAmount > state.balance) return state;
      if (state.activeExpeditions.length >= MAX_EXPEDITIONS) return state;

      const reward = calculateReward(stakeAmount, durationMs, tier);
      const expedition: Expedition = {
        id: crypto.randomUUID(),
        stakeAmount,
        durationMs,
        startedAt: Date.now(),
        tier,
        reward,
      };

      return {
        ...state,
        balance: Math.round((state.balance - stakeAmount) * 100) / 100,
        activeExpeditions: [...state.activeExpeditions, expedition],
      };
    }

    case "COMPLETE_EXPEDITION":
    case "RETURN_EXPEDITION": {
      const { id } = action.payload;
      const expedition = state.activeExpeditions.find((e) => e.id === id);
      if (!expedition) return state;

      const completed: CompletedExpedition = {
        id: expedition.id,
        stakeAmount: expedition.stakeAmount,
        reward: expedition.reward,
        tier: expedition.tier,
        completedAt: Date.now(),
      };

      return {
        ...state,
        balance:
          Math.round((state.balance + expedition.reward) * 100) / 100,
        activeExpeditions: state.activeExpeditions.filter((e) => e.id !== id),
        completedExpeditions: [completed, ...state.completedExpeditions].slice(
          0,
          20
        ),
        pendingReturns: [...state.pendingReturns, completed],
      };
    }

    case "DISMISS_RETURN": {
      return {
        ...state,
        pendingReturns: state.pendingReturns.filter(
          (r) => r.id !== action.payload.id
        ),
      };
    }

    case "SET_BALANCE": {
      return {
        ...state,
        balance: action.payload,
      };
    }

    case "LOAD_STATE": {
      return action.payload;
    }

    case "SYNC_POSITIONS": {
      const onChainExpeditions = action.payload
        .filter((pos) => Number(pos.stakedAmount) > 0)
        .map(stakingPositionToExpedition);

      // Keep local-only expeditions that aren't duplicated by on-chain data
      const onChainIds = new Set(onChainExpeditions.map((e) => e.id));
      const localOnly = state.activeExpeditions.filter(
        (e) => !e.id.startsWith("onchain-") && !onChainIds.has(e.id)
      );

      return {
        ...state,
        activeExpeditions: [...onChainExpeditions, ...localOnly],
      };
    }

    default:
      return state;
  }
}

const GameStateContext = createContext<GameState>(INITIAL_STATE);
const GameDispatchContext = createContext<Dispatch<GameAction>>(() => {});

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE, () => {
    const saved = loadGameState();
    if (!saved) return INITIAL_STATE;
    return { ...saved, pendingReturns: saved.pendingReturns || [] };
  });

  useEffect(() => {
    saveGameState(state);
  }, [state]);

  return (
    <GameStateContext.Provider value={state}>
      <GameDispatchContext.Provider value={dispatch}>
        {children}
      </GameDispatchContext.Provider>
    </GameStateContext.Provider>
  );
}

export function useGameState() {
  return useContext(GameStateContext);
}

export function useGameDispatch() {
  return useContext(GameDispatchContext);
}
