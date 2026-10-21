import { useState, type ReactElement } from "react";
import { useGameState } from "../contexts/useGame";
import { useWallet } from "../contexts/useWallet";
import { formatTl } from "../utils/rewards";
import { Icon } from "./Icon";
import { TierIcon } from "./TierIcon";

/** Voyage Log rows shown before "View All". */
const LOG_PREVIEW = 4;

/** Completed voyages, newest first. Renders nothing before the first return. */
export function VoyageLog(): ReactElement | null {
  const { completedExpeditions } = useGameState();
  const { token } = useWallet();
  const [showAllLog, setShowAllLog] = useState(false);

  if (completedExpeditions.length === 0) return null;

  const logEntries = showAllLog
    ? completedExpeditions
    : completedExpeditions.slice(0, LOG_PREVIEW);

  return (
    <div className="voyage-log pixel-panel">
      <div className="section-head">
        <h3 className="section-title">
          <Icon name="ship" />
          Voyage Log
        </h3>
        {completedExpeditions.length > LOG_PREVIEW && (
          <button
            className="view-all"
            onClick={() => setShowAllLog((v) => !v)}
            aria-expanded={showAllLog}
          >
            <Icon
              name="chevron-right"
              size={12}
              className={`view-all-chevron${showAllLog ? " open" : ""}`}
            />
            {showAllLog ? "Show Less" : "View All"}
          </button>
        )}
      </div>
      <div className="log-entries">
        {logEntries.map((exp) => (
          <div
            key={exp.id}
            className={`log-entry ${exp.succeeded ? "log-win" : "log-loss"}`}
          >
            <TierIcon tier={exp.tier} className="tier-icon-log" />
            <span className="log-stake">{formatTl(exp.stake, token)}</span>
            <span className="log-outcome">
              {exp.succeeded
                ? formatTl(exp.payout - exp.stake, token, "+")
                : formatTl(exp.stake, token, "\u2212")}
            </span>
            <span className="log-date">
              {new Date(exp.completedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
