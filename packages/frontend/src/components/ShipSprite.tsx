import type { CSSProperties } from "react";
import { ShipImage } from "./ShipImage";
import { HARBOR_LANES, harborReach } from "../utils/harbor";
import type { Tier } from "../utils/rewards";

interface ShipSpriteProps {
  /** Picks the harbor column the ship sails in. */
  tier: Tier;
  /** How long the ship has been at sea. Drives position and wear. */
  elapsedMs: number;
  /** The ship's own voyage length; it stops there. */
  durationMs: number;
  /** Longest voyage of the ship's tier; maps to the column's far edge. */
  maxDurationMs: number;
  /** This ship's row among its tier's ships, and how many there are. */
  slot: number;
  slotCount: number;
  size?: number;
}

export function ShipSprite({
  tier,
  elapsedMs,
  durationMs,
  maxDurationMs,
  slot,
  slotCount,
  size = 32,
}: ShipSpriteProps) {
  const reach = harborReach(elapsedMs, durationMs, maxDurationMs);
  const lane = Math.max(HARBOR_LANES.indexOf(tier), 0);
  const laneWidth = 100 / HARBOR_LANES.length;

  return (
    <div
      className="ship-sprite ship-sailing"
      style={
        {
          // Sail from the column's left edge until the sprite touches its right.
          left: `calc(${lane * laneWidth}% + ${reach} * (${laneWidth}% - ${size}px))`,
          // Spread a tier's ships down its column so they don't stack.
          top: `${((slot + 1) / (slotCount + 1)) * 100}%`,
          zIndex: 2 + slot,
          animationDelay: `${reach * 500}ms`,
        } as CSSProperties
      }
    >
      <ShipImage elapsedMs={elapsedMs} size={size} />
    </div>
  );
}
