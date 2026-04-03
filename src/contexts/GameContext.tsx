import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
  type Dispatch,
} from "react";
import { calculateReward, type Tier } from "../utils/rewards";
import { saveGameState, loadGameState } from "../utils/persistence";

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
  | { type: "DISMISS_RETURN"; payload: { id: string } }
  | { type: "SET_BALANCE"; payload: number }
  | { type: "LOAD_STATE"; payload: GameState };

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

    case "COMPLETE_EXPEDITION": {
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

    // Auto-complete expeditions that finished while away
    const now = Date.now();
    const stillActive: Expedition[] = [];
    let balance = saved.balance;
    const newCompleted: CompletedExpedition[] = [];

    for (const exp of saved.activeExpeditions) {
      if (exp.startedAt + exp.durationMs <= now) {
        balance = Math.round((balance + exp.reward) * 100) / 100;
        newCompleted.push({
          id: exp.id,
          stakeAmount: exp.stakeAmount,
          reward: exp.reward,
          tier: exp.tier,
          completedAt: exp.startedAt + exp.durationMs,
        });
      } else {
        stillActive.push(exp);
      }
    }

    return {
      ...saved,
      balance,
      activeExpeditions: stillActive,
      completedExpeditions: [
        ...newCompleted,
        ...saved.completedExpeditions,
      ].slice(0, 20),
      pendingReturns: [...(saved.pendingReturns || []), ...newCompleted],
    };
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
