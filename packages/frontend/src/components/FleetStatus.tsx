import { useGameState } from "../contexts/useGame";
import { ExpeditionCard } from "./ExpeditionCard";

export function FleetStatus() {
  const { activeExpeditions, rules } = useGameState();

  if (activeExpeditions.length === 0) return null;

  return (
    <div className="fleet-status">
      <h2 className="section-title">
        Active Fleet ({activeExpeditions.length}/{rules?.maxShips ?? "…"})
      </h2>
      <div className="fleet-list">
        {activeExpeditions.map((exp) => (
          <ExpeditionCard key={exp.id} expedition={exp} />
        ))}
      </div>
    </div>
  );
}
