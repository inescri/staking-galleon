import shipImage from "../assets/ships/ship.png";
import { wearLevel } from "../utils/wear";
import { TIER_CONFIGS, type Tier } from "../utils/rewards";

interface ShipImageProps {
  /** How long the ship has been at sea. Drives the wear look. */
  elapsedMs: number;
  /** Names the ship's tier in its alt text when set. */
  tier?: Tier;
  size?: number;
  className?: string;
}

/** The one ship sprite, weathered by time at sea (see utils/wear.ts). */
export function ShipImage({
  elapsedMs,
  tier,
  size = 32,
  className = "",
}: ShipImageProps) {
  const wear = wearLevel(elapsedMs);
  return (
    <img
      className={`ship-image ship-wear-${wear} ${className}`.trim()}
      src={shipImage}
      alt={tier ? `${TIER_CONFIGS[tier].name} ${wear} ship` : `${wear} ship`}
      width={size}
      height={size}
      draggable={false}
    />
  );
}
