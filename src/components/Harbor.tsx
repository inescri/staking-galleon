import { useGameState } from "../contexts/GameContext";
import { useCountdown } from "../hooks/useCountdown";
import { ShipSprite } from "./ShipSprite";
import type { Expedition } from "../contexts/GameContext";

function HarborShip({ expedition }: { expedition: Expedition }) {
  const { progress } = useCountdown(
    expedition.startedAt,
    expedition.durationMs
  );

  return (
    <ShipSprite tier={expedition.tier} progress={progress} size={36} />
  );
}

export function Harbor() {
  const { activeExpeditions } = useGameState();

  return (
    <div className="harbor">
      <div className="harbor-sky">
        <div className="sun" />
        <div className="cloud cloud-1" />
        <div className="cloud cloud-2" />
      </div>
      <div className="harbor-ocean">
        {activeExpeditions.map((exp) => (
          <HarborShip key={exp.id} expedition={exp} />
        ))}
        {activeExpeditions.length === 0 && (
          <div className="harbor-empty">No ships at sea... Launch an expedition!</div>
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
