import { useMemo } from "react";
import { useGameState } from "../contexts/useGame";
import { useCountdown } from "../hooks/useCountdown";
import { ShipSprite } from "./ShipSprite";
import { HARBOR_LANES, maxVoyageMsByTier } from "../utils/harbor";
import { TIER_CONFIGS } from "../utils/rewards";
import type { Expedition } from "../contexts/GameContext";

function HarborShip({
  expedition,
  maxDurationMs,
  slot,
  slotCount,
}: {
  expedition: Expedition;
  maxDurationMs: number;
  slot: number;
  slotCount: number;
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
      slot={slot}
      slotCount={slotCount}
      size={36}
    />
  );
}

export function Harbor() {
  const { activeExpeditions, rules } = useGameState();
  const maxByTier = useMemo(() => maxVoyageMsByTier(rules), [rules]);

  // Row of each ship within its tier's column, in launch order.
  const slots = useMemo(() => {
    const counts = new Map<string, number>();
    const rows = new Map<string, number>();
    for (const exp of activeExpeditions) {
      const row = counts.get(exp.tier) ?? 0;
      rows.set(exp.id, row);
      counts.set(exp.tier, row + 1);
    }
    return { counts, rows };
  }, [activeExpeditions]);

  return (
    <div className="harbor">
      <div className="harbor-sky">
        <div className="sun" />
        <div className="cloud cloud-1" />
        <div className="cloud cloud-2" />
      </div>
      <div className="harbor-ocean">
        {HARBOR_LANES.map((tier) => (
          <div key={tier} className={`sea-band sea-band-${tier}`}>
            <span className="sea-band-label">{TIER_CONFIGS[tier].name}</span>
          </div>
        ))}
        {activeExpeditions.map((exp) => (
          <HarborShip
            key={exp.id}
            expedition={exp}
            maxDurationMs={maxByTier[exp.tier] ?? 0}
            slot={slots.rows.get(exp.id) ?? 0}
            slotCount={slots.counts.get(exp.tier) ?? 1}
          />
        ))}
        {activeExpeditions.length === 0 && (
          <div className="harbor-empty">
            No ships at sea... Launch an expedition!
          </div>
        )}
        <div className="wave wave-1" />
        <div className="wave wave-2" />
        <div className="wave wave-3" />
      </div>
      <div className="harbor-dock">
        <div className="dock-planks" />
      </div>
    </div>
  );
}
