import type { GameConfig } from "./game";

/**
 * The game token (Odin `2j5i`) has `decimals = 3` and `divisibility = 8`, so
 * one whole token is 10^11 base units. The canister only ever stores and
 * returns base units; the frontend formats them with the token's real units.
 */
export const TOKEN_BASE_UNITS = 10n ** 11n;

/** Whole tokens → base units. */
export function tokens(n: number | bigint): bigint {
  return BigInt(n) * TOKEN_BASE_UNITS;
}

const HOUR_MS = 60n * 60n * 1000n;
const DAY_MS = 24n * HOUR_MS;

export const MAX_FLEET = 5;

/**
 * Seeded at `@init`; the admin can replace it with `set_config`. Expected
 * value per option (see `expectedValueBps`) sits between -2% and -3% so the
 * pool is sustainable on average while every option still feels winnable.
 */
export const DEFAULT_CONFIG: GameConfig = {
  maxShips: MAX_FLEET,
  difficulties: [
    {
      difficulty: "coastal",
      name: "Coastal Trade",
      stake: tokens(100),
      durations: [
        {
          label: "1h",
          durationMs: 1n * HOUR_MS,
          failBps: 500,
          multiplierBps: 10_300,
        },
        {
          label: "6h",
          durationMs: 6n * HOUR_MS,
          failBps: 1_000,
          multiplierBps: 10_900,
        },
        {
          label: "1d",
          durationMs: 1n * DAY_MS,
          failBps: 1_500,
          multiplierBps: 11_500,
        },
      ],
    },
    {
      difficulty: "open_sea",
      name: "Open Sea",
      stake: tokens(500),
      durations: [
        {
          label: "6h",
          durationMs: 6n * HOUR_MS,
          failBps: 1_500,
          multiplierBps: 11_500,
        },
        {
          label: "1d",
          durationMs: 1n * DAY_MS,
          failBps: 2_000,
          multiplierBps: 12_200,
        },
        {
          label: "3d",
          durationMs: 3n * DAY_MS,
          failBps: 2_500,
          multiplierBps: 13_000,
        },
      ],
    },
    {
      difficulty: "deep_ocean",
      name: "Deep Ocean",
      stake: tokens(1_000),
      durations: [
        {
          label: "1d",
          durationMs: 1n * DAY_MS,
          failBps: 3_000,
          multiplierBps: 14_000,
        },
        {
          label: "3d",
          durationMs: 3n * DAY_MS,
          failBps: 3_500,
          multiplierBps: 15_000,
        },
        {
          label: "7d",
          durationMs: 7n * DAY_MS,
          failBps: 4_000,
          multiplierBps: 16_200,
        },
      ],
    },
    {
      difficulty: "kraken_waters",
      name: "Kraken Waters",
      stake: tokens(5_000),
      durations: [
        {
          label: "1d",
          durationMs: 1n * DAY_MS,
          failBps: 4_500,
          multiplierBps: 17_800,
        },
        {
          label: "3d",
          durationMs: 3n * DAY_MS,
          failBps: 5_000,
          multiplierBps: 19_500,
        },
        {
          label: "7d",
          durationMs: 7n * DAY_MS,
          failBps: 6_000,
          multiplierBps: 24_500,
        },
      ],
    },
  ],
};
