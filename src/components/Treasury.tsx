import { useGameState, useGameDispatch } from "../contexts/GameContext";
import { formatDoubloons, TIER_CONFIGS } from "../utils/rewards";

export function Treasury() {
  const { balance, completedExpeditions } = useGameState();
  const dispatch = useGameDispatch();

  return (
    <div className="treasury">
      <div className="balance-row">
        <span className="balance-label">Treasury</span>
        <span className="balance-amount">
          <span className="coin-icon">&#x1FA99;</span>{" "}
          {formatDoubloons(balance)} Doubloons
        </span>
      </div>
      <button
        className="pixel-btn faucet-btn"
        onClick={() => dispatch({ type: "CLAIM_FREE_DOUBLOONS" })}
      >
        + Claim 500 Doubloons
      </button>

      {completedExpeditions.length > 0 && (
        <div className="voyage-log">
          <h3 className="section-title">Voyage Log</h3>
          <div className="log-entries">
            {completedExpeditions.slice(0, 8).map((exp) => {
              const multiplier = exp.reward / exp.stakeAmount;
              const profit = exp.reward - exp.stakeAmount;
              const isProfit = profit >= 0;
              const config = TIER_CONFIGS[exp.tier];
              return (
                <div key={exp.id} className="log-entry">
                  <span className="log-tier">{config.emoji}</span>
                  <span className="log-stake">
                    {formatDoubloons(exp.stakeAmount)}
                  </span>
                  <span className={`log-result ${isProfit ? "profit" : "loss"}`}>
                    {isProfit ? "+" : ""}
                    {formatDoubloons(profit)} ({multiplier.toFixed(2)}x)
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
