import { DIFFICULTIES, type Difficulty } from "../canister/idl";
import type { TokenUnits } from "../contexts/useWallet";

/**
 * UI name for a canister difficulty. Aliasing the Candid union means adding a
 * difficulty on the canister forces `TIER_CONFIGS` to grow (compile error)
 * while the components keep their `tier` vocabulary.
 */
export type Tier = Difficulty;
export const TIERS = DIFFICULTIES;

/**
 * Display meta only — stakes, durations, risk and reward come from the
 * canister. Icons live in `components/TierIcon.tsx`.
 */
export interface TierConfig {
  name: string;
  color: string;
}

export const TIER_CONFIGS: Record<Tier, TierConfig> = {
  coastal: { name: "Coastal Trade", color: "#53a8b6" },
  open_sea: { name: "Open Sea", color: "#FFB347" },
  deep_ocean: { name: "Deep Ocean", color: "#E67E22" },
  kraken_waters: { name: "Kraken Waters", color: "#c0392b" },
};

/**
 * Units of the game token (`hjun`) used only until the real ones have been
 * fetched with the balance.
 */
export const FALLBACK_TOKEN_UNITS: TokenUnits = {
  decimals: 3,
  divisibility: 8,
};

export function formatTaels(n: number): string {
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
  return formatTaels(unitsToNumber(amount, units));
}

/** Coin shown before every short-form "tl" amount. */
export const COIN = "\u{1FA99}";

/** Base units → "🪙1,234.5 tl", with an optional leading "+" or "−". */
export function formatTl(
  amount: bigint,
  units: TokenUnits | null,
  sign: "" | "+" | "\u2212" = "",
): string {
  return `${COIN}${sign}${formatUnits(amount, units)} tl`;
}

/** "45m", "1h", "36h", "3d". */
export function formatDurationMs(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

/** Live countdown: "4:05", "3:04:05", "2d 3:04:05". Rounds up to the second. */
export function formatRemainingMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ss = seconds.toString().padStart(2, "0");
  if (days === 0 && hours === 0) return `${minutes}:${ss}`;
  const hms = `${hours}:${minutes.toString().padStart(2, "0")}:${ss}`;
  return days === 0 ? hms : `${days}d ${hms}`;
}

/** Basis points → "5%", "12.5%". */
export function formatBps(bps: number): string {
  const pct = bps / 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`;
}
