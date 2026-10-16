/**
 * Canister/network config, read from Vite env with the game's defaults.
 * Override in `.env` (see `.env.example`). On `dfx deploy` the canister id
 * is also bridged from the root `.env` by `vite.config.ts`.
 */
import { odin } from "../odin/client";

/** An env value, or `fallback` when the variable is unset or blank. */
function envOr(raw: string | undefined, fallback: string): string {
  return raw === undefined || raw === "" ? fallback : raw;
}

/** Mainnet game canister (deployed against the Odin dev ledger). */
const MAINNET_CANISTER_ID = "gkvcg-5aaaa-aaaae-qkpzq-cai";

/**
 * The game canister: ICRC-2 spender, delegation target and actor target.
 * Explicit `VITE_APP_CANISTER_ID` wins; else the id dfx wrote on the last
 * deploy; else the mainnet id.
 */
export const APP_CANISTER_ID = envOr(
  import.meta.env.VITE_APP_CANISTER_ID,
  envOr(import.meta.env.VITE_DFX_CANISTER_ID, MAINNET_CANISTER_ID),
);

/** dfx network: `ic` (default — hosted builds set nothing) or `local`. */
export const DFX_NETWORK = envOr(
  import.meta.env.VITE_DFX_NETWORK,
  envOr(import.meta.env.VITE_DFX_NETWORK_FROM_DFX, "ic"),
);

export const IS_LOCAL = DFX_NETWORK === "local";

/** Odin token id staked by the game. */
export const TOKEN_ID = envOr(import.meta.env.VITE_TOKEN_ID, "hjun");

/** The token's page on the Odin site of the configured `VITE_ODIN_ENV`. */
export const TOKEN_URL = `${odin.origin}/token/${TOKEN_ID}`;

/** Odin's BTC token id — the asset the ledger fee is denominated in. */
export const BTC_TOKEN_ID = "btc";

/**
 * BTC (millisats) the winner approves before Return Ship: the canister pulls
 * one ledger fee to fund the payout transfer, and the pull itself costs the
 * same fee again. Mirrors `ODIN_BTC_FEE` in `packages/canister/src/odin.ts`.
 */
export const PAYOUT_FEE_APPROVAL = 200_000n;

/**
 * Principals allowed to see the treasury deposit form. Client-side gate
 * only: `fund_pool` itself stays open on the canister (it only ever pulls
 * the caller's own approved tokens). Comma-separated in `VITE_ADMIN_PRINCIPALS`.
 */
export const ADMIN_PRINCIPALS: readonly string[] = envOr(
  import.meta.env.VITE_ADMIN_PRINCIPALS,
  "",
)
  .split(",")
  .map((p) => p.trim())
  .filter((p) => p !== "");

/** Replica/boundary host. */
export const IC_HOST = envOr(
  import.meta.env.VITE_IC_HOST,
  IS_LOCAL ? "http://127.0.0.1:4943" : "https://icp0.io",
);
