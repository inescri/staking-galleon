import { DIFFICULTIES, type Difficulty } from "../canister/idl";
import type { TokenUnits } from "../contexts/useWallet";

/**
 * UI name for a canister difficulty. Aliasing the Candid union means adding a
 * difficulty on the canister forces `TIER_CONFIGS` to grow (compile error)
 * while the components keep their `tier` vocabulary.
 */
export type Tier = Difficulty;
export const TIERS = DIFFICULTIES;

/** Display meta only — stakes, durations, risk and reward come from the canister. */
export interface TierConfig {
  name: string;
  emoji: string;
  color: string;
}

export const TIER_CONFIGS: Record<Tier, TierConfig> = {
  coastal: { name: "Coastal Trade", emoji: "⛵", color: "#53a8b6" },
  open_sea: { name: "Open Sea", emoji: "\u{1F6A2}", color: "#FFB347" },
  deep_ocean: { name: "Deep Ocean", emoji: "\u{1F30A}", color: "#E67E22" },
  kraken_waters: {
    name: "Kraken Waters",
    emoji: "\u{1F419}",
    color: "#c0392b",
  },
};

/**
 * Units of the game token (`hjun`) used only until the real ones have been
 * fetched with the balance.
 */
export const FALLBACK_TOKEN_UNITS: TokenUnits = {
  decimals: 3,
  divisibility: 8,
};

export function formatDoubloons(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/** Base units → whole tokens as a display number. */
export function unitsToNumber(
  amount: bigint,
  units: TokenUnits | null,
): number {
  const u = units ?? FALLBACK_TOKEN_UNITS;
  return Number(amount) / Math.pow(10, u.divisibility + u.decimals);
}

export function formatUnits(amount: bigint, units: TokenUnits | null): string {
  return formatDoubloons(unitsToNumber(amount, units));
}

/** "45m", "1h", "36h", "3d". */
export function formatDurationMs(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

/** Basis points → "5%", "12.5%". */
export function formatBps(bps: number): string {
  const pct = bps / 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`;
}
