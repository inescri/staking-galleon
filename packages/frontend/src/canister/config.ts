/**
 * Canister/network config, read from Vite env with the game's defaults.
 * Override in `.env` (see `.env.example`).
 */

/** Staking canister principal — delegation target + actor target. */
export const STAKING_CANISTER_ID =
  import.meta.env.VITE_STAKING_CANISTER_ID ?? "sfgyi-iyaaa-aaaam-qepyq-cai";

/** Odin token id staked by the game. */
export const TOKEN_ID = import.meta.env.VITE_TOKEN_ID ?? "2j5i";

export const TOKEN_URL = `https://dev.odin.fun/token/${TOKEN_ID}`;

/** IC boundary host (mainnet). */
export const IC_HOST = import.meta.env.VITE_IC_HOST ?? "https://icp0.io";
