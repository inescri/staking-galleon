import { useReducer, type ReactNode } from "react";
import { GameStateContext, GameDispatchContext } from "./useGame";
import {
  INITIAL_GAME_STATE,
  isActiveStatus,
  shipToCompleted,
  shipToExpedition,
  type Expedition,
  type CompletedExpedition,
  type DispatchedExpedition,
  type GameState,
  type GameAction,
} from "../utils/game";
import { fromCandidShipStatus } from "../canister/idl";

export type {
  Expedition,
  CompletedExpedition,
  DispatchedExpedition,
  GameState,
  GameAction,
};

const VOYAGE_LOG_LIMIT = 20;

/**
 * The canister is the source of truth: `SYNC_SHIPS` replaces the fleet and
 * the voyage log wholesale from `get_my_ships`. Local actions only queue
 * toasts and bridge the moment between a confirmed call and the next sync.
 */
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SET_RULES":
      return { ...state, rules: action.payload };

    case "SET_BALANCE":
      return {
        ...state,
        balance: action.payload.balance,
        balanceUnits: action.payload.balanceUnits,
      };

    case "SYNC_SHIPS": {
      const active: Expedition[] = [];
      const completed: CompletedExpedition[] = [];
      for (const ship of action.payload) {
        if (isActiveStatus(fromCandidShipStatus(ship.status))) {
          active.push(shipToExpedition(ship));
        } else {
          completed.push(shipToCompleted(ship));
        }
      }
      active.sort((a, b) => a.startedAt - b.startedAt);
      completed.sort((a, b) => b.completedAt - a.completedAt);
      return {
        ...state,
        activeExpeditions: active,
        completedExpeditions: completed.slice(0, VOYAGE_LOG_LIMIT),
      };
    }

    case "SHIP_LAUNCHED":
      return {
        ...state,
        pendingDispatches: [...state.pendingDispatches, action.payload],
      };

    case "SHIP_RETURNED": {
      const done = action.payload;
      return {
        ...state,
        activeExpeditions: state.activeExpeditions.filter(
          (e) => e.id !== done.id,
        ),
        completedExpeditions: [
          done,
          ...state.completedExpeditions.filter((c) => c.id !== done.id),
        ].slice(0, VOYAGE_LOG_LIMIT),
        pendingReturns: [...state.pendingReturns, done],
      };
    }

    case "DISMISS_RETURN":
      return {
        ...state,
        pendingReturns: state.pendingReturns.filter(
          (r) => r.id !== action.payload.id,
        ),
      };

    case "DISMISS_DISPATCH":
      return {
        ...state,
        pendingDispatches: state.pendingDispatches.filter(
          (d) => d.id !== action.payload.id,
        ),
      };

    default:
      return state;
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_GAME_STATE);

  return (
    <GameStateContext.Provider value={state}>
      <GameDispatchContext.Provider value={dispatch}>
        {children}
      </GameDispatchContext.Provider>
    </GameStateContext.Provider>
  );
}
