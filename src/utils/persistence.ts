import type { GameState } from "../contexts/GameContext";

const STORAGE_KEY = "galleon-stakes";

export function saveGameState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // silently fail if storage is full
  }
}

export function loadGameState(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}
