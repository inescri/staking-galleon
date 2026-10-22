import { DIFFICULTIES, type Difficulty } from "../canister/idl";
import type { TokenUnits } from "../contexts/useWallet";
import { LOCALE_TAGS, translate, type Locale } from "../i18n/translate";

/**
 * UI name for a canister difficulty. Aliasing the Candid union means adding a
 * difficulty on the canister forces `TIER_CONFIGS` to grow (compile error)
 * while the components keep their `tier` vocabulary.
 */
export type Tier = Difficulty;
export const TIERS = DIFFICULTIES;

/**
 * Display meta only — stakes, durations, risk and reward come from the
 * canister. Names are the `tier.*` message keys; icons live in
 * `components/TierIcon.tsx`.
 */
export interface TierConfig {
  color: string;
}

export const TIER_CONFIGS: Record<Tier, TierConfig> = {
  coastal: { color: "#53a8b6" },
  open_sea: { color: "#FFB347" },
  deep_ocean: { color: "#E67E22" },
  kraken_waters: { color: "#c0392b" },
};

/**
 * Units of the game token (`hjun`) used only until the real ones have been
 * fetched with the balance.
 */
export const FALLBACK_TOKEN_UNITS: TokenUnits = {
  decimals: 3,
  divisibility: 8,
};

function formatAmount(n: number, locale: Locale): string {
  return n.toLocaleString(LOCALE_TAGS[locale], {
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

export function formatUnits(
  amount: bigint,
  units: TokenUnits | null,
  locale: Locale,
): string {
  return formatAmount(unitsToNumber(amount, units), locale);
}

/** Coin shown before every short-form "tl" amount (also inlined in `amount.tl`). */
export const COIN = "\u{1FA99}";

/** Base units → "🪙 1,234.5 tl", with an optional leading "+" or "−". */
export function formatTl(
  amount: bigint,
  units: TokenUnits | null,
  locale: Locale,
  sign: "" | "+" | "\u2212" = "",
): string {
  return translate(locale, "amount.tl", {
    sign,
    amount: formatUnits(amount, units, locale),
  });
}

/** Basis points of a whole (10 000 = 100%); a 10 000 multiplier is stake back. */
const BPS = 10_000;

/**
 * Stake + reward a winning voyage pays, floored to base units. Mirrors the
 * canister's `computePayout` (`packages/canister/src/game.ts`); a parity test
 * keeps them in step.
 */
export function computePayout(stake: bigint, multiplierBps: number): bigint {
  return stake + (stake * BigInt(multiplierBps - BPS)) / BigInt(BPS);
}

/** Reward on top of the stake, in basis points of it (11 500 → 1 500). */
export function rewardBps(multiplierBps: number): number {
  return multiplierBps - BPS;
}

/**
 * "45m", "90m", "1h", "36h", "1d", "3d" (en) / "45分钟", "3天" (zh). Uses the
 * largest unit that divides the duration exactly, so the lock-up shown is
 * never rounded away from what the canister enforces.
 */
export function formatDurationMs(ms: number, locale: Locale): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes > 0 && minutes % 1440 === 0)
    return translate(locale, "duration.days", { n: minutes / 1440 });
  if (minutes > 0 && minutes % 60 === 0)
    return translate(locale, "duration.hours", { n: minutes / 60 });
  return translate(locale, "duration.minutes", { n: minutes });
}

/** Live countdown: "4:05", "3:04:05", "2d 3:04:05". Rounds up to the second. */
export function formatRemainingMs(ms: number, locale: Locale): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ss = seconds.toString().padStart(2, "0");
  if (days === 0 && hours === 0) return `${minutes}:${ss}`;
  const hms = `${hours}:${minutes.toString().padStart(2, "0")}:${ss}`;
  return days === 0
    ? hms
    : translate(locale, "countdown.withDays", { days, time: hms });
}

/** Basis points → "5%", "12.5%". */
export function formatBps(bps: number): string {
  const pct = bps / 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`;
}
