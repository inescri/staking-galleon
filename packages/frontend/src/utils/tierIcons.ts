import coastal from "../assets/tiers/coastal.jpg";
import openSea from "../assets/tiers/open_sea.jpg";
import deepOcean from "../assets/tiers/deep_ocean.jpg";
import krakenWaters from "../assets/tiers/kraken_waters.jpg";
import type { Tier } from "./rewards";

/** Pixel-art badge per difficulty (256px JPEG, bundled by Vite). */
export const TIER_ICONS: Record<Tier, string> = {
  coastal,
  open_sea: openSea,
  deep_ocean: deepOcean,
  kraken_waters: krakenWaters,
};
