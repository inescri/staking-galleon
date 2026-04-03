import { useGameState } from "../contexts/GameContext";
import { useWallet } from "../contexts/WalletContext";
import { formatDoubloons, TIER_CONFIGS } from "../utils/rewards";

export function Treasury() {
  const { completedExpeditions } = useGameState();
  const {
    connectedUser,
    principal,
    isConnecting,
    connectionError,
    connectWallet,
    disconnectWallet,
    getTokenBalance,
  } = useWallet();

  const balance = getTokenBalance("2jjj");

  return (
    <div className="treasury">
      <div className="balance-row">
        <span className="balance-label">Treasury</span>
        <span className="balance-amount">
          <span className="coin-icon">&#x1FA99;</span>{" "}
          {formatDoubloons(balance)} Doubloons
        </span>
      </div>

      <div className="wallet-row">
        {connectedUser ? (
          <div className="wallet-connected-row">
            <div className="wallet-info">
              <span className="wallet-status-dot" />
              <span className="wallet-principal">{principal}</span>
            </div>
            <button
              className="pixel-btn-sm wallet-disconnect-btn"
              onClick={disconnectWallet}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="wallet-connect-row">
            <button
              className="pixel-btn wallet-connect-btn"
              onClick={connectWallet}
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
            {connectionError && (
              <span className="wallet-error">{connectionError}</span>
            )}
          </div>
        )}
      </div>

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
