import type { Tier } from "../utils/rewards";

import coastalShip from "../assets/ships/coastal.png";
import openSeaShip from "../assets/ships/open_sea.png";
import deepOceanShip from "../assets/ships/deep_ocean.png";
import krakenWatersShip from "../assets/ships/kraken_waters.png";

interface ShipSpriteProps {
  tier: Tier;
  progress: number;
  size?: number;
}

const SHIP_IMAGES: Record<Tier, string> = {
  coastal: coastalShip,
  open_sea: openSeaShip,
  deep_ocean: deepOceanShip,
  kraken_waters: krakenWatersShip,
};

export function ShipSprite({ tier, progress, size = 32 }: ShipSpriteProps) {
  return (
    <div
      className={`ship-sprite ship-sailing`}
      style={{
        left: `${5 + progress * 85}%`,
        animationDelay: `${progress * 500}ms`,
      }}
    >
      <img
        src={SHIP_IMAGES[tier]}
        alt={`${tier} ship`}
        width={size}
        height={size}
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
