import { useCallback, useEffect, useState } from "react";
import { useWallet } from "../contexts/useWallet";
import { useGameCanister } from "../hooks/useGameCanister";
import {
  ADMIN_PRINCIPALS,
  APP_CANISTER_ID,
  TOKEN_ID,
} from "../canister/config";
import type { PoolStats } from "../canister/idl";
import { parseTokenAmount } from "../utils/game";
import { formatTl } from "../utils/rewards";
import { useLocale, useT } from "../i18n/useLocale";
import { resolveText, type UiText } from "../i18n/translate";
import {
  approvalFor,
  claimRequest,
  type ApprovalReturnState,
} from "../odin/approvalFlow";

/**
 * House pool status for everyone, plus a deposit form for the principals in
 * `VITE_ADMIN_PRINCIPALS`. The gate is cosmetic: `fund_pool` is open on the
 * canister (it only pulls the caller's own pre-approved tokens).
 */
export function FundTreasury() {
  const {
    connectedUser,
    identity,
    principal,
    request,
    token,
    isRestoring,
    refreshBalances,
  } = useWallet();
  const isAdmin = principal !== "" && ADMIN_PRINCIPALS.includes(principal);
  const { fundPool, getPoolStats } = useGameCanister();
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [amount, setAmount] = useState("");
  const [isFunding, setIsFunding] = useState(false);
  const [deposited, setDeposited] = useState<{
    amount: bigint;
    available: bigint;
  } | null>(null);
  const [error, setError] = useState<UiText | null>(null);
  const { locale } = useLocale();
  const t = useT();

  const loadStats = useCallback(async () => {
    try {
      setStats(await getPoolStats());
    } catch (err) {
      console.error("Failed to fetch pool stats:", err);
    }
  }, [getPoolStats]);

  useEffect(() => {
    if (APP_CANISTER_ID === "") return;
    void loadStats();
  }, [loadStats]);

  const approval = approvalFor(request, "fund");
  const isApproving = approval?.request.status === "pending";
  const parsed = token === null ? null : parseTokenAmount(amount, token);
  const canFund =
    connectedUser !== null &&
    parsed !== null &&
    !isApproving &&
    !isFunding &&
    !isRestoring;

  // 1. Approve the game token for the deposit; the amount travels in the
  //    SDK's `request.input`, so nothing needs to survive a redirect.
  const handleFund = () => {
    if (!canFund || !connectedUser || parsed === null) return;
    setError(null);
    setDeposited(null);
    const returnState: ApprovalReturnState = { flow: "fund" };
    void connectedUser.icrcApprove({
      token: TOKEN_ID,
      spender: APP_CANISTER_ID,
      amount: parsed,
      returnState,
    });
  };

  // 2. Once approved, pull the deposit into the pool.
  useEffect(() => {
    const current = approvalFor(request, "fund");
    if (current === null) return;
    const { id, status, input } = current.request;

    if (status === "rejected") {
      if (claimRequest(id)) setError({ key: "pool.error.approvalRejected" });
      return;
    }
    if (status === "failed") {
      if (claimRequest(id)) {
        setError(
          current.request.error
            ? { raw: current.request.error }
            : { key: "pool.error.approvalFailed" },
        );
      }
      return;
    }
    if (status !== "success") return;
    if (isRestoring) return;
    if (identity === null) {
      if (claimRequest(id)) {
        setError({ key: "pool.error.noDelegation" });
      }
      return;
    }
    if (!claimRequest(id)) return;

    void (async () => {
      setIsFunding(true);
      setError(null);
      try {
        const available = await fundPool(input.amount);
        setDeposited({ amount: input.amount, available });
        setAmount("");
        await Promise.all([loadStats(), refreshBalances()]);
      } catch (err) {
        console.error("Fund pool failed:", err);
        setError(
          err instanceof Error
            ? { raw: err.message }
            : { key: "pool.error.depositFailed" },
        );
      } finally {
        setIsFunding(false);
      }
    })();
  }, [request, identity, isRestoring, fundPool, loadStats, refreshBalances]);

  return (
    <details className="fund-treasury">
      <summary>{t("pool.title")}</summary>
      <div className="pool-stats">
        {stats ? (
          <>
            <span>
              {t("pool.available")}{" "}
              <b>{formatTl(stats.available, token, locale)}</b>
            </span>
            <span>
              {t("pool.reserved")}{" "}
              <b>{formatTl(stats.reserved, token, locale)}</b>
            </span>
            <span>
              {t("pool.atSea")}{" "}
              <b>{formatTl(stats.activeStakes, token, locale)}</b>
            </span>
            {stats.pendingPayouts > 0n && (
              <span>
                {t("pool.owed")}{" "}
                <b>{formatTl(stats.pendingPayouts, token, locale)}</b>
              </span>
            )}
          </>
        ) : (
          <span>{t("pool.loading")}</span>
        )}
      </div>
      <p className="fund-hint">{t("pool.hint")}</p>
      {isAdmin && (
        <>
          <div className="fund-row">
            <input
              type="number"
              className="pixel-input"
              placeholder={t("pool.amountPlaceholder")}
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button
              className="pixel-btn-sm"
              disabled={!canFund}
              onClick={handleFund}
            >
              {isApproving
                ? t("pool.approving")
                : isFunding
                  ? t("pool.depositing")
                  : t("pool.fund")}
            </button>
          </div>
          {deposited && (
            <span className="toast-result">
              {t("pool.deposited", {
                amount: formatTl(deposited.amount, token, locale),
                available: formatTl(deposited.available, token, locale),
              })}
            </span>
          )}
          {error && (
            <span className="wallet-error">{resolveText(t, error)}</span>
          )}
        </>
      )}
    </details>
  );
}
