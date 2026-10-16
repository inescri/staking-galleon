import coastal from "../assets/tiers/coastal.jpg";
import openSea from "../assets/tiers/open_sea.jpg";
import deepOcean from "../assets/tiers/deep_ocean.jpg";
import krakenWaters from "../assets/tiers/kraken_waters.jpg";
import { TIER_CONFIGS, type Tier } from "../utils/rewards";

const TIER_ICONS: Record<Tier, string> = {
  coastal,
  open_sea: openSea,
  deep_ocean: deepOcean,
  kraken_waters: krakenWaters,
};

/** Pixel-art badge for a difficulty; sized by the surrounding CSS class. */
export function TierIcon({
  tier,
  className = "",
}: {
  tier: Tier;
  className?: string;
}) {
  return (
    <img
      className={`tier-icon ${className}`.trim()}
      src={TIER_ICONS[tier]}
      alt={TIER_CONFIGS[tier].name}
      draggable={false}
    />
  );
}
