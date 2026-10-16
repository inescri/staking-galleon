import { createContext, useContext, type Dispatch } from "react";
import {
  INITIAL_GAME_STATE,
  type GameState,
  type GameAction,
} from "../utils/game";

export const GameStateContext = createContext<GameState>(INITIAL_GAME_STATE);
export const GameDispatchContext = createContext<Dispatch<GameAction>>(
  () => {},
);

export function useGameState() {
  return useContext(GameStateContext);
}

export function useGameDispatch() {
  return useContext(GameDispatchContext);
}
