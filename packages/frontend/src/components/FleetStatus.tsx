import { useGameState } from "../contexts/useGame";
import { useT } from "../i18n/useLocale";
import { ExpeditionCard } from "./ExpeditionCard";

export function FleetStatus() {
  const { activeExpeditions, rules } = useGameState();
  const t = useT();

  if (activeExpeditions.length === 0) return null;

  return (
    <div className="fleet-status">
      <h2 className="section-title">
        {t("fleet.title", {
          count: activeExpeditions.length,
          max: rules?.maxShips ?? "…",
        })}
      </h2>
      <div className="fleet-list">
        {activeExpeditions.map((exp) => (
          <ExpeditionCard key={exp.id} expedition={exp} />
        ))}
      </div>
    </div>
  );
}
