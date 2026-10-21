import type { CSSProperties } from "react";
import { ShipImage } from "./ShipImage";
import { HARBOR_LANES, harborReach } from "../utils/harbor";
import type { Tier } from "../utils/rewards";

interface ShipSpriteProps {
  /** Picks the harbor band the ship sails in. */
  tier: Tier;
  /** How long the ship has been at sea. Drives position and wear. */
  elapsedMs: number;
  /** The ship's own voyage length; it stops there. */
  durationMs: number;
  /** Longest voyage in the config; maps to the far edge. */
  maxDurationMs: number;
  size?: number;
}

/** Horizontal span (% of the ocean) from the dock to the far edge. */
const DOCK_LEFT = 5;
const RANGE = 85;

export function ShipSprite({
  tier,
  elapsedMs,
  durationMs,
  maxDurationMs,
  size = 32,
}: ShipSpriteProps) {
  const reach = harborReach(elapsedMs, durationMs, maxDurationMs);
  const lane = Math.max(HARBOR_LANES.indexOf(tier), 0);

  return (
    <div
      className="ship-sprite ship-sailing"
      style={
        {
          left: `${DOCK_LEFT + reach * RANGE}%`,
          top: `${((lane + 0.5) / HARBOR_LANES.length) * 100}%`,
          // Nearer bands draw over farther ones.
          zIndex: 2 + lane,
          animationDelay: `${reach * 500}ms`,
        } as CSSProperties
      }
    >
      <ShipImage elapsedMs={elapsedMs} size={size} />
    </div>
  );
}
