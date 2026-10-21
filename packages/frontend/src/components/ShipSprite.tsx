import type { CSSProperties } from "react";
import { ShipImage } from "./ShipImage";
import { harborReach, lanePerspective } from "../utils/harbor";
import type { Tier } from "../utils/rewards";

interface ShipSpriteProps {
  /** Picks the harbor band the ship sails in. */
  tier: Tier;
  /** How long the ship has been at sea. Drives position and wear. */
  elapsedMs: number;
  /** The ship's own voyage length; it stops there. */
  durationMs: number;
  /** Longest voyage of the ship's tier; maps to its band's far edge. */
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
  const lane = lanePerspective(tier);

  return (
    <div
      className="ship-sprite ship-sailing"
      style={
        {
          left: `${DOCK_LEFT + reach * RANGE}%`,
          top: `${lane.topPct}%`,
          opacity: lane.opacity,
          // Far ships look smaller; nearer bands draw over farther ones.
          "--ship-scale": lane.scale,
          zIndex: 2 + Math.round((1 - lane.depth) * 10),
          animationDelay: `${reach * 500}ms`,
        } as CSSProperties
      }
    >
      <ShipImage elapsedMs={elapsedMs} size={size} />
    </div>
  );
}
