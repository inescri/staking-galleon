import type { CSSProperties, ReactElement } from "react";
import { ShipImage } from "./ShipImage";
import { harborReach, lanePerspective, shipTopPct } from "../utils/harbor";
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
  /** Launch order among ships in the same band; picks its row. */
  slot: number;
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
  slot,
  size = 32,
}: ShipSpriteProps): ReactElement {
  const reach = harborReach(elapsedMs, durationMs, maxDurationMs);
  const lane = lanePerspective(tier);
  const top = shipTopPct(tier, slot);

  return (
    <div
      className="ship-sprite ship-sailing"
      style={
        {
          left: `${DOCK_LEFT + reach * RANGE}%`,
          top: `${top}%`,
          opacity: lane.opacity,
          // Far ships look smaller; lower (nearer) ships draw over higher ones.
          "--ship-scale": lane.scale,
          zIndex: 2 + Math.round(top),
          animationDelay: `${reach * 500}ms`,
        } as CSSProperties
      }
    >
      <ShipImage elapsedMs={elapsedMs} size={size} />
    </div>
  );
}
