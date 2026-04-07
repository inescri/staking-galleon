import { useState } from "react";
import { useGameState } from "../contexts/useGame";
import { useWallet, truncatePrincipal } from "../contexts/useWallet";
import { TOKEN_URL } from "../canister/actor";
import { formatDoubloons, TIER_CONFIGS } from "../utils/rewards";

export function Treasury() {
  const { balance, completedExpeditions } = useGameState();
  const { refreshBalances } = useWallet();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshBalances();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="treasury">
      <div className="balance-row">
        <span className="balance-label">Treasury</span>
        <span className="balance-amount">
          <span className="coin-icon">&#x1FA99;</span>{" "}
          {formatDoubloons(balance)} Doubloons
          <button
            className="refresh-balance-btn"
            onClick={handleRefresh}
            disabled={refreshing}
            >
            <svg
              className={`refresh-icon${refreshing ? " spinning" : ""}`}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
              <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
            </svg>
          </button>
        </span>
        <a
          href={TOKEN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="buy-doubloons-link"
        >
          Buy 
        </a>
      </div>

      {completedExpeditions.length > 0 && (
        <div className="voyage-log">
          <h3 className="section-title">Voyage Log</h3>
          <div className="log-entries">
            {completedExpeditions.slice(0, 8).map((exp) => {
              const config = TIER_CONFIGS[exp.tier];
              const principal = exp.id.split(":").slice(1).join(":");
              return (
                <div key={exp.id+exp.completedAt.toString()} className="log-entry">
                  <span className="log-tier">{config.emoji}</span>
                  <span className="log-stake">
                    {formatDoubloons(exp.stakeAmount)} dbl
                  </span>
                  <span className="log-date">
                    {new Date(exp.completedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="log-principal">{truncatePrincipal(principal)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
