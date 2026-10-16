import type { CSSProperties } from "react";
import { ShipImage } from "./ShipImage";
import { seaDepth } from "../utils/wear";

interface ShipSpriteProps {
  /** How far along the voyage the ship is, 0..1. Drives horizontal position. */
  progress: number;
  /** How long the ship has been at sea. Drives wear and distance. */
  elapsedMs: number;
  /** Sprite size when the ship has just left the dock. */
  size?: number;
}

/** Vertical position (% of the ocean) at the dock and on the horizon. */
const NEAR_TOP = 34;
const FAR_TOP = 8;
/** Sprite scale on the horizon, relative to `size`. */
const FAR_SCALE = 0.45;
/** Haze on the horizon. */
const FAR_OPACITY = 0.7;

export function ShipSprite({
  progress,
  elapsedMs,
  size = 32,
}: ShipSpriteProps) {
  const depth = seaDepth(elapsedMs);

  return (
    <div
      className="ship-sprite ship-sailing"
      style={
        {
          left: `${5 + progress * 85}%`,
          top: `${NEAR_TOP - (NEAR_TOP - FAR_TOP) * depth}%`,
          opacity: 1 - (1 - FAR_OPACITY) * depth,
          "--ship-scale": 1 - (1 - FAR_SCALE) * depth,
          // Nearer ships draw over farther ones.
          zIndex: 2 + Math.round((1 - depth) * 10),
          animationDelay: `${progress * 500}ms`,
        } as CSSProperties
      }
    >
      <ShipImage elapsedMs={elapsedMs} size={size} />
    </div>
  );
}
