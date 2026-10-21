import { useMemo, type CSSProperties } from "react";
import { useGameState } from "../contexts/useGame";
import { useCountdown } from "../hooks/useCountdown";
import { ShipSprite } from "./ShipSprite";
import {
  HARBOR_LANES,
  HARBOR_LANE_WEIGHTS,
  lanePerspective,
  maxVoyageMs,
} from "../utils/harbor";
import { TIER_CONFIGS } from "../utils/rewards";
import type { Expedition } from "../contexts/GameContext";

function HarborShip({
  expedition,
  maxDurationMs,
}: {
  expedition: Expedition;
  maxDurationMs: number;
}) {
  const { elapsedMs } = useCountdown(
    expedition.startedAt,
    expedition.durationMs,
  );

  return (
    <ShipSprite
      tier={expedition.tier}
      elapsedMs={elapsedMs}
      durationMs={expedition.durationMs}
      maxDurationMs={maxDurationMs}
      size={36}
    />
  );
}

export function Harbor() {
  const { activeExpeditions, rules } = useGameState();
  const maxDurationMs = useMemo(() => maxVoyageMs(rules), [rules]);

  return (
    <div className="harbor">
      <div className="harbor-sky">
        <div className="sun" />
        <div className="cloud cloud-1" />
        <div className="cloud cloud-2" />
      </div>
      <div className="harbor-ocean">
        {HARBOR_LANES.map((tier, i) => (
          <div
            key={tier}
            className={`sea-band sea-band-${tier}`}
            style={
              {
                flexGrow: HARBOR_LANE_WEIGHTS[i],
                // Farther bands get smaller, slower waves.
                "--wave-scale": lanePerspective(tier).waveScale,
                "--wave-speed": lanePerspective(tier).waveSpeed,
              } as CSSProperties
            }
          >
            <div className="wave wave-1" />
            <div className="wave wave-2" />
            <div className="wave wave-3" />
            <span className="sea-band-label">{TIER_CONFIGS[tier].name}</span>
          </div>
        ))}
        {activeExpeditions.map((exp) => (
          <HarborShip
            key={exp.id}
            expedition={exp}
            maxDurationMs={maxDurationMs}
          />
        ))}
        {activeExpeditions.length === 0 && (
          <div className="harbor-empty">
            No ships at sea... Launch an expedition!
          </div>
        )}
      </div>
      <div className="harbor-dock">
        <div className="dock-planks" />
      </div>
    </div>
  );
}
