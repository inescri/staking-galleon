import { useEffect, useState } from "react";
import { useGameState } from "../contexts/useGame";
import { useWallet } from "../contexts/useWallet";
import { BUY_BTC_AMOUNT, TOKEN_ID, TOKEN_URL } from "../canister/config";
import { claimRequest } from "../odin/approvalFlow";
import { COIN, formatUnits } from "../utils/rewards";
import { useLocale, useT } from "../i18n/useLocale";
import { resolveText, type UiText } from "../i18n/translate";
import { FundTreasury } from "./FundTreasury";
import { Icon } from "./Icon";

export function Treasury() {
  const { balanceUnits } = useGameState();
  const {
    connectedUser,
    request,
    refreshBalances,
    refreshBalanceUntilChanged,
    isSettling,
    token,
  } = useWallet();
  const [refreshing, setRefreshing] = useState(false);
  const [buyError, setBuyError] = useState<UiText | null>(null);
  const { locale } = useLocale();
  const t = useT();

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
          setBuyError({ key: "treasury.buy.refreshHint" });
        });
      }
    } else if (status === "rejected") {
      if (claimRequest(id)) setBuyError({ key: "treasury.buy.cancelled" });
    } else if (status === "failed") {
      if (claimRequest(id)) {
        setBuyError(
          request.error
            ? { raw: request.error }
            : { key: "treasury.buy.failed" },
        );
      }
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
          {t("treasury.title")}
        </span>
        <span className="balance-amount">
          <span className="coin-icon">{COIN}</span>
          {t("treasury.balance", {
            amount: formatUnits(balanceUnits, token, locale),
          })}
          <button
            className="refresh-balance-btn"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label={t("treasury.refresh")}
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
            className="buy-taels-link"
            onClick={handleBuy}
            disabled={isBuying}
          >
            {isBuying ? t("treasury.buying") : t("treasury.buy")}
          </button>
        ) : (
          <a
            href={TOKEN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="buy-taels-link"
          >
            {t("treasury.buy")}
          </a>
        )}
      </div>
      {buyError && (
        <span className="wallet-error">{resolveText(t, buyError)}</span>
      )}

      <FundTreasury />
    </div>
  );
}
