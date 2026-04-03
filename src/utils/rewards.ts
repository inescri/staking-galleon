export type Tier = "coastal" | "open_sea" | "deep_ocean" | "kraken_waters";

export interface TierConfig {
  name: string;
  emoji: string;
  minDuration: number; // seconds
  maxDuration: number;
  color: string;
}

export const TIER_CONFIGS: Record<Tier, TierConfig> = {
  coastal: {
    name: "Coastal Trade",
    emoji: "\u26F5",
    minDuration: 30,
    maxDuration: 60,
    color: "#53a8b6",
  },
  open_sea: {
    name: "Open Sea",
    emoji: "\u{1F6A2}",
    minDuration: 60,
    maxDuration: 180,
    color: "#0f3460",
  },
  deep_ocean: {
    name: "Deep Ocean",
    emoji: "\u{1F30A}",
    minDuration: 180,
    maxDuration: 300,
    color: "#1a1a2e",
  },
  kraken_waters: {
    name: "Kraken Waters",
    emoji: "\u{1F419}",
    minDuration: 300,
    maxDuration: 600,
    color: "#c0392b",
  },
};

export function formatDoubloons(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
