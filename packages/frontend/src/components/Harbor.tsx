import { useMemo, type CSSProperties, type ReactElement } from "react";
import { useGameState } from "../contexts/useGame";
import { useCountdown } from "../hooks/useCountdown";
import { ShipSprite } from "./ShipSprite";
import {
  HARBOR_LANES,
  lanePerspective,
  maxVoyageMsByTier,
} from "../utils/harbor";
import type { Expedition } from "../contexts/GameContext";

function HarborShip({
  expedition,
  maxDurationMs,
  slot,
}: {
  expedition: Expedition;
  maxDurationMs: number;
  slot: number;
}): ReactElement {
  const { elapsedMs, progress } = useCountdown(
    expedition.startedAt,
    expedition.durationMs,
  );

  return (
    <ShipSprite
      tier={expedition.tier}
      elapsedMs={elapsedMs}
      progress={progress}
      durationMs={expedition.durationMs}
      maxDurationMs={maxDurationMs}
      slot={slot}
      size={36}
    />
  );
}

export function Harbor(): ReactElement {
  const { activeExpeditions, rules } = useGameState();
  const maxByTier = useMemo(() => maxVoyageMsByTier(rules), [rules]);

  // Each ship's launch order within its band (fleet is sorted by startedAt).
  const slots = useMemo(() => {
    const seen = new Map<string, number>();
    const out = new Map<string, number>();
    for (const exp of activeExpeditions) {
      const slot = seen.get(exp.tier) ?? 0;
      out.set(exp.id, slot);
      seen.set(exp.tier, slot + 1);
    }
    return out;
  }, [activeExpeditions]);

  return (
    <div className="harbor pixel-panel">
      <div className="harbor-inner">
        <div className="harbor-sky">
          <div className="sun" />
        </div>
        <div className="harbor-ocean">
          {HARBOR_LANES.map((tier) => {
            const lane = lanePerspective(tier);
            return (
              <div
                key={tier}
                className={`sea-band sea-band-${tier}`}
                style={
                  {
                    // Height share of the ocean; thinner toward the horizon.
                    flex: `${lane.weight} 1 0`,
                    // Farther bands get smaller, slower waves.
                    "--wave-scale": lane.waveScale,
                    "--wave-speed": lane.waveSpeed,
                  } as CSSProperties
                }
              >
                <div className="wave wave-1" />
                <div className="wave wave-2" />
                <div className="wave wave-3" />
              </div>
            );
          })}
          {/* Positions need each tier's longest voyage from the config; hold
            ships back until it loads so they don't slide on arrival. */}
          {rules !== null &&
            activeExpeditions.map((exp) => (
              <HarborShip
                key={exp.id}
                expedition={exp}
                maxDurationMs={maxByTier[exp.tier] ?? 0}
                slot={slots.get(exp.id) ?? 0}
              />
            ))}
          {rules === null && activeExpeditions.length > 0 && (
            <div className="harbor-empty">Charting the seas...</div>
          )}
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
    </div>
  );
}
