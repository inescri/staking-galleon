import { useEffect, useRef, useState } from "react";
import { useGameState } from "../contexts/useGame";
import { useWallet } from "../contexts/useWallet";
import { BUY_BTC_AMOUNT, TOKEN_ID, TOKEN_URL } from "../canister/config";
import { claimRequest } from "../odin/approvalFlow";
import { formatDoubloons, formatUnits } from "../utils/rewards";
import { FundTreasury } from "./FundTreasury";
import { TierIcon } from "./TierIcon";

const BUY_REFRESH_ATTEMPTS = 10;
const BUY_REFRESH_INTERVAL_MS = 2000;

export function Treasury() {
  const { balance, balanceUnits, completedExpeditions } = useGameState();
  const { connectedUser, request, refreshBalances, token } = useWallet();
  const [refreshing, setRefreshing] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  // Latest balance for the post-buy poll below, which outlives one render.
  const balanceUnitsRef = useRef(balanceUnits);
  balanceUnitsRef.current = balanceUnits;

  const isBuying =
    (request?.action === "buy" && request.status === "pending") || refreshing;

  // Buy through Odin: started without awaiting (redirect mode reloads the
  // page); the outcome lands in `request` and is handled below.
  const handleBuy = () => {
    if (!connectedUser || isBuying) return;
    setBuyError(null);
    void connectedUser.buy({ token: TOKEN_ID, btcAmount: BUY_BTC_AMOUNT });
  };

  // A successful buy settles on Odin asynchronously, so the balance the API
  // returns right after `success` is usually still the old one. Re-fetch
  // until the balance changes (or give up after a few tries).
  useEffect(() => {
    if (request?.action !== "buy") return;
    const { id, status } = request;
    if (status === "success") {
      if (!claimRequest(id)) return;
      // No cleanup/cancel here: the id is claimed once, so a StrictMode
      // re-run or a remount must not abandon the poll.
      const before = balanceUnitsRef.current;
      const poll = async () => {
        setRefreshing(true);
        try {
          for (let attempt = 0; attempt < BUY_REFRESH_ATTEMPTS; attempt++) {
            await refreshBalances();
            if (balanceUnitsRef.current !== before) return;
            await new Promise((r) => setTimeout(r, BUY_REFRESH_INTERVAL_MS));
          }
        } finally {
          setRefreshing(false);
        }
      };
      void poll();
    } else if (status === "rejected") {
      if (claimRequest(id)) setBuyError("Purchase was cancelled.");
    } else if (status === "failed") {
      if (claimRequest(id)) setBuyError(request.error ?? "Purchase failed.");
    }
  }, [request, refreshBalances]);

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

      {completedExpeditions.length > 0 && (
        <div className="voyage-log">
          <h3 className="section-title">Voyage Log</h3>
          <div className="log-entries">
            {completedExpeditions.slice(0, 8).map((exp) => {
              return (
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
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
