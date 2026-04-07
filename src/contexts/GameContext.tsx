import { useEffect, useReducer, type ReactNode } from "react";
import { GameStateContext, GameDispatchContext } from "./useGame";
import {
  stakingPositionToExpedition,
  inferTier,
  type Expedition,
  type CompletedExpedition,
  type DispatchedExpedition,
  type GameState,
  type GameAction,
} from "../utils/game";

export type {
  Expedition,
  CompletedExpedition,
  DispatchedExpedition,
  GameState,
  GameAction,
};

const MAX_EXPEDITIONS = 5;

const INITIAL_STATE: GameState = {
  balance: 0,
  activeExpeditions: [],
  completedExpeditions: [],
  pendingReturns: [],
  pendingDispatches: [],
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "LAUNCH_EXPEDITION": {
      const { id, stakeAmount, durationMs, tier } = action.payload;
      if (stakeAmount > state.balance) return state;
      if (state.activeExpeditions.length >= MAX_EXPEDITIONS) return state;
      if (state.activeExpeditions.some((e) => e.id === id)) return state;

      const expedition: Expedition = {
        id,
        stakeAmount,
        durationMs,
        startedAt: Date.now(),
        tier,
      };

      return {
        ...state,
        balance: state.balance - stakeAmount,
        activeExpeditions: [...state.activeExpeditions, expedition],
        pendingDispatches: [
          ...state.pendingDispatches,
          { id: expedition.id, stakeAmount, tier },
        ],
      };
    }

    case "RETURN_EXPEDITION": {
      const { id } = action.payload;
      const expedition = state.activeExpeditions.find((e) => e.id === id);
      if (!expedition) return state;

      const completed: CompletedExpedition = {
        id: expedition.id,
        stakeAmount: expedition.stakeAmount,
        tier: expedition.tier,
        completedAt: Date.now(),
      };

      return {
        ...state,
        activeExpeditions: state.activeExpeditions.filter((e) => e.id !== id),
        completedExpeditions: [completed, ...state.completedExpeditions].slice(
          0,
          20,
        ),
        balance: state.balance + expedition.stakeAmount,
        pendingReturns: [...state.pendingReturns, completed],
      };
    }

    case "DISMISS_RETURN": {
      return {
        ...state,
        pendingReturns: state.pendingReturns.filter(
          (r) => r.id !== action.payload.id,
        ),
      };
    }

    case "DISMISS_DISPATCH": {
      return {
        ...state,
        pendingDispatches: state.pendingDispatches.filter(
          (d) => d.id !== action.payload.id,
        ),
      };
    }

    case "EXTEND_EXPEDITION": {
      const { id, additionalDurationMs } = action.payload;
      return {
        ...state,
        activeExpeditions: state.activeExpeditions.map((e) =>
          e.id === id
            ? {
                ...e,
                durationMs: e.durationMs + additionalDurationMs,
                tier: inferTier(e.durationMs + additionalDurationMs),
              }
            : e,
        ),
      };
    }

    case "INCREASE_AMOUNT": {
      const { id, additionalAmount } = action.payload;
      if (additionalAmount > state.balance) return state;
      return {
        ...state,
        balance: state.balance - additionalAmount,
        activeExpeditions: state.activeExpeditions.map((e) =>
          e.id === id
            ? { ...e, stakeAmount: e.stakeAmount + additionalAmount }
            : e,
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

      const onChainIds = new Set(onChainExpeditions.map((e) => e.id));
      const localOnly = state.activeExpeditions.filter(
        (e) => !onChainIds.has(e.id),
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

const VOYAGE_LOG_KEY = "voyage-log";

function loadCompletedExpeditions(): CompletedExpedition[] {
  try {
    const raw = localStorage.getItem(VOYAGE_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCompletedExpeditions(entries: CompletedExpedition[]): void {
  try {
    localStorage.setItem(VOYAGE_LOG_KEY, JSON.stringify(entries));
  } catch (e) {
    console.warn("localStorage write failed", e);
  }
}

const ACTIVE_EXPEDITIONS_KEY = "active-expeditions";

function loadActiveExpeditions(): Expedition[] {
  try {
    const raw = localStorage.getItem(ACTIVE_EXPEDITIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveActiveExpeditions(entries: Expedition[]): void {
  try {
    localStorage.setItem(ACTIVE_EXPEDITIONS_KEY, JSON.stringify(entries));
  } catch (e) {
    console.warn("localStorage write failed", e);
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => ({
    ...INITIAL_STATE,
    completedExpeditions: loadCompletedExpeditions(),
    activeExpeditions: loadActiveExpeditions(),
  }));

  useEffect(() => {
    saveCompletedExpeditions(state.completedExpeditions);
  }, [state.completedExpeditions]);

  useEffect(() => {
    saveActiveExpeditions(state.activeExpeditions);
  }, [state.activeExpeditions]);

  return (
    <GameStateContext.Provider value={state}>
      <GameDispatchContext.Provider value={dispatch}>
        {children}
      </GameDispatchContext.Provider>
    </GameStateContext.Provider>
  );
}
