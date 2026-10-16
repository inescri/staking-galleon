import shipImage from "../assets/ships/ship.png";
import { wearLevel } from "../utils/wear";

interface ShipSpriteProps {
  /** How far along the voyage the ship is, 0..1. Drives horizontal position. */
  progress: number;
  /** How long the ship has been at sea. Drives the wear look. */
  elapsedMs: number;
  size?: number;
}

export function ShipSprite({
  progress,
  elapsedMs,
  size = 32,
}: ShipSpriteProps) {
  const wear = wearLevel(elapsedMs);

  return (
    <div
      className="ship-sprite ship-sailing"
      style={{
        left: `${5 + progress * 85}%`,
        animationDelay: `${progress * 500}ms`,
      }}
    >
      <img
        className={`ship-image ship-wear-${wear}`}
        src={shipImage}
        alt={`${wear} ship`}
        width={size}
        height={size}
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
