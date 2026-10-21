import { useEffect, useState } from "react";
import { useGameState } from "../contexts/useGame";
import { useWallet } from "../contexts/useWallet";
import { BUY_BTC_AMOUNT, TOKEN_ID, TOKEN_URL } from "../canister/config";
import { claimRequest } from "../odin/approvalFlow";
import { formatDoubloons, formatUnits } from "../utils/rewards";
import { FundTreasury } from "./FundTreasury";
import { Icon } from "./Icon";
import { TierIcon } from "./TierIcon";

/** Voyage Log rows shown before "View All". */
const LOG_PREVIEW = 4;

export function Treasury() {
  const { balance, completedExpeditions } = useGameState();
  const {
    connectedUser,
    request,
    refreshBalances,
    refreshBalanceUntilChanged,
    isSettling,
    token,
  } = useWallet();
  const [refreshing, setRefreshing] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [showAllLog, setShowAllLog] = useState(false);

  const isBuying = request?.action === "buy" && request.status === "pending";
  const isRefreshing = refreshing || isSettling;

  // Buy through Odin: started without awaiting (redirect mode reloads the
  // page); the outcome lands in `request` and is handled below.
  const handleBuy = () => {
    if (!connectedUser || isBuying) return;
    setBuyError(null);
    void connectedUser.buy({ token: TOKEN_ID, btcAmount: BUY_BTC_AMOUNT });
  };

  // A successful buy settles on Odin asynchronously, so the balance is
  // polled until it changes (see `refreshBalanceUntilChanged`). The id is
  // claimed once, so a StrictMode re-run or remount cannot start a second poll.
  useEffect(() => {
    if (request?.action !== "buy") return;
    const { id, status } = request;
    if (status === "success") {
      if (claimRequest(id)) {
        refreshBalanceUntilChanged().catch((err: unknown) => {
          console.error("Failed to refresh balance after buy:", err);
          setBuyError("Purchase succeeded; refresh to see your balance.");
        });
      }
    } else if (status === "rejected") {
      if (claimRequest(id)) setBuyError("Purchase was cancelled.");
    } else if (status === "failed") {
      if (claimRequest(id)) setBuyError(request.error ?? "Purchase failed.");
    }
  }, [request, refreshBalanceUntilChanged]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshBalances();
    } finally {
      setRefreshing(false);
    }
  };

  const logEntries = showAllLog
    ? completedExpeditions
    : completedExpeditions.slice(0, LOG_PREVIEW);

  return (
    <>
      <div className="treasury pixel-panel">
        <div className="balance-row">
          <span className="balance-label">
            <Icon name="wallet" size={18} />
            Treasury
          </span>
          <span className="balance-amount">
            <span className="coin-icon">&#x1FA99;</span>
            {formatDoubloons(balance)} Doubloons
            <button
              className="refresh-balance-btn"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="Refresh balance"
            >
              <Icon
                name="refresh"
                size={18}
                className={`refresh-icon${isRefreshing ? " spinning" : ""}`}
              />
            </button>
          </span>
          {connectedUser ? (
            <button
              className="buy-doubloons-link"
              onClick={handleBuy}
              disabled={isBuying}
            >
              {isBuying ? "Buying..." : "Buy"}
            </button>
          ) : (
            <a
              href={TOKEN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="buy-doubloons-link"
            >
              Buy
            </a>
          )}
        </div>
        {buyError && <span className="wallet-error">{buyError}</span>}

        <FundTreasury />
      </div>

      {completedExpeditions.length > 0 && (
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
                <Icon name="chevron-right" size={12} />
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
                <span className="log-stake">
                  {formatUnits(exp.stake, token)} dbl
                </span>
                <span className="log-outcome">
                  {exp.succeeded
                    ? `+${formatUnits(exp.payout - exp.stake, token)}`
                    : `\u2212${formatUnits(exp.stake, token)}`}
                </span>
                <span className="log-date">
                  {new Date(exp.completedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                <Icon name="chevron-right" className="log-chevron" />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
