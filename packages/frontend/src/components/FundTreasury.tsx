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
import { formatUnits } from "../utils/rewards";
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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setMessage(null);
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
      if (claimRequest(id)) setError("Approval was rejected.");
      return;
    }
    if (status === "failed") {
      if (claimRequest(id)) {
        setError(current.request.error ?? "Approval failed.");
      }
      return;
    }
    if (status !== "success") return;
    if (isRestoring) return;
    if (identity === null) {
      if (claimRequest(id)) {
        setError(
          "Approved, but the wallet session has no delegation. Reconnect and try again.",
        );
      }
      return;
    }
    if (!claimRequest(id)) return;

    void (async () => {
      setIsFunding(true);
      setError(null);
      try {
        const available = await fundPool(input.amount);
        setMessage(
          `Deposited ${formatUnits(input.amount, token)} tl. Pool now has ${formatUnits(available, token)} tl available.`,
        );
        setAmount("");
        await Promise.all([loadStats(), refreshBalances()]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Deposit failed";
        console.error("Fund pool failed:", err);
        setError(msg);
      } finally {
        setIsFunding(false);
      }
    })();
  }, [
    request,
    identity,
    isRestoring,
    token,
    fundPool,
    loadStats,
    refreshBalances,
  ]);

  return (
    <details className="fund-treasury">
      <summary>House pool</summary>
      <div className="pool-stats">
        {stats ? (
          <>
            <span>
              Available: <b>{formatUnits(stats.available, token)}</b> tl
            </span>
            <span>
              Reserved: <b>{formatUnits(stats.reserved, token)}</b> tl
            </span>
            <span>
              At sea: <b>{formatUnits(stats.activeStakes, token)}</b> tl
            </span>
            {stats.pendingPayouts > 0n && (
              <span>
                Owed: <b>{formatUnits(stats.pendingPayouts, token)}</b> tl
              </span>
            )}
          </>
        ) : (
          <span>Loading…</span>
        )}
      </div>
      <p className="fund-hint">
        Rewards are reserved from the available pool at launch; bigger voyages
        need a bigger pool.
      </p>
      {isAdmin && (
        <>
          <div className="fund-row">
            <input
              type="number"
              className="pixel-input"
              placeholder="Amount in tl"
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
                ? "Approving..."
                : isFunding
                  ? "Depositing..."
                  : "Fund"}
            </button>
          </div>
          {message && <span className="toast-result">{message}</span>}
          {error && <span className="wallet-error">{error}</span>}
        </>
      )}
    </details>
  );
}
