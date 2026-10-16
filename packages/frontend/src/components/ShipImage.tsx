import shipImage from "../assets/ships/ship.png";
import { wearLevel } from "../utils/wear";

interface ShipImageProps {
  /** How long the ship has been at sea. Drives the wear look. */
  elapsedMs: number;
  size?: number;
  className?: string;
}

/** The one ship sprite, weathered by time at sea (see utils/wear.ts). */
export function ShipImage({
  elapsedMs,
  size = 32,
  className = "",
}: ShipImageProps) {
  const wear = wearLevel(elapsedMs);
  return (
    <img
      className={`ship-image ship-wear-${wear} ${className}`.trim()}
      src={shipImage}
      alt={`${wear} ship`}
      width={size}
      height={size}
      draggable={false}
      style={{ imageRendering: "pixelated" }}
    />
  );
}
