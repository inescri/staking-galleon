import { createContext, useContext, type Dispatch } from "react";
import type { GameState, GameAction } from "../utils/game";

const INITIAL_STATE: GameState = {
  balance: 0,
  activeExpeditions: [],
  completedExpeditions: [],
  pendingReturns: [],
  pendingDispatches: [],
};

export const GameStateContext = createContext<GameState>(INITIAL_STATE);
export const GameDispatchContext = createContext<Dispatch<GameAction>>(() => {});

export function useGameState() {
  return useContext(GameStateContext);
}

export function useGameDispatch() {
  return useContext(GameDispatchContext);
}
