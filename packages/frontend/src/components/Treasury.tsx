import { useEffect, useState } from "react";
import { useGameState } from "../contexts/useGame";
import { useWallet } from "../contexts/useWallet";
import { BUY_BTC_AMOUNT, TOKEN_ID, TOKEN_URL } from "../canister/config";
import { claimRequest } from "../odin/approvalFlow";
import { formatDoubloons } from "../utils/rewards";
import { FundTreasury } from "./FundTreasury";
import { Icon } from "./Icon";

export function Treasury() {
  const { balance } = useGameState();
  const {
    connectedUser,
    request,
    refreshBalances,
    refreshBalanceUntilChanged,
    isSettling,
  } = useWallet();
  const [refreshing, setRefreshing] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

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

  return (
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
  );
}
