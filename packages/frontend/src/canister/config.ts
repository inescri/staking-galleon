/**
 * Canister/network config, read from Vite env with the game's defaults.
 * Override in `.env` (see `.env.example`).
 */
import { odin } from "../odin/client";

/** An env value, or `fallback` when the variable is unset or blank. */
function envOr(raw: string | undefined, fallback: string): string {
  return raw === undefined || raw === "" ? fallback : raw;
}

/** Staking canister principal — delegation target + actor target. */
export const STAKING_CANISTER_ID = envOr(
  import.meta.env.VITE_STAKING_CANISTER_ID,
  "sfgyi-iyaaa-aaaam-qepyq-cai",
);

/** Odin token id staked by the game. */
export const TOKEN_ID = envOr(import.meta.env.VITE_TOKEN_ID, "2j5i");

/** The token's page on the Odin site of the configured `VITE_ODIN_ENV`. */
export const TOKEN_URL = `${odin.origin}/token/${TOKEN_ID}`;

/** IC boundary host (mainnet). */
export const IC_HOST = envOr(import.meta.env.VITE_IC_HOST, "https://icp0.io");
