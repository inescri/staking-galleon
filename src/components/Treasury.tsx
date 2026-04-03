import { useState } from "react";
import { useGameState } from "../contexts/GameContext";
import { useWallet } from "../contexts/WalletContext";
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
        </span>
        <button
          className="refresh-balance-btn"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? "..." : "Refresh"}
        </button>
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
              return (
                <div key={exp.id} className="log-entry">
                  <span className="log-tier">{config.emoji}</span>
                  <span className="log-stake">
                    {formatDoubloons(exp.stakeAmount)} dbl
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
