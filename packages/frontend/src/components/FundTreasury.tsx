import { useCallback, useEffect, useState } from "react";
import { OdinUtils } from "odin-connect";
import { useWallet } from "../contexts/useWallet";
import { useGameCanister } from "../hooks/useGameCanister";
import { APP_CANISTER_ID, TOKEN_ID } from "../canister/config";
import type { PoolStats } from "../canister/idl";
import { formatUnits } from "../utils/rewards";
import {
  approvalFor,
  claimRequest,
  type ApprovalReturnState,
} from "../odin/approvalFlow";

/**
 * House pool status plus a deposit form. `fund_pool` is open to anyone (it
 * only pulls the caller's own pre-approved tokens), so this is how the admin
 * seeds rewards and how a generous player can top them up.
 */
export function FundTreasury() {
  const {
    connectedUser,
    identity,
    request,
    token,
    isRestoring,
    refreshBalances,
  } = useWallet();
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
  const parsed = Number(amount);
  const canFund =
    connectedUser !== null &&
    token !== null &&
    Number.isFinite(parsed) &&
    parsed > 0 &&
    !isApproving &&
    !isFunding &&
    !isRestoring;

  // 1. Approve the game token for the deposit; the amount travels in the
  //    SDK's `request.input`, so nothing needs to survive a redirect.
  const handleFund = () => {
    if (!canFund || !connectedUser || token === null) return;
    setError(null);
    setMessage(null);
    const returnState: ApprovalReturnState = { flow: "fund" };
    void connectedUser.icrcApprove({
      token: TOKEN_ID,
      spender: APP_CANISTER_ID,
      amount: OdinUtils.convertToOdinAmount(parsed, token),
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
          `Deposited ${formatUnits(input.amount, token)} dbl. Pool now has ${formatUnits(available, token)} dbl available.`,
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
              Available: <b>{formatUnits(stats.available, token)}</b> dbl
            </span>
            <span>
              Reserved: <b>{formatUnits(stats.reserved, token)}</b> dbl
            </span>
            <span>
              At sea: <b>{formatUnits(stats.activeStakes, token)}</b> dbl
            </span>
            {stats.pendingPayouts > 0n && (
              <span>
                Owed: <b>{formatUnits(stats.pendingPayouts, token)}</b> dbl
              </span>
            )}
          </>
        ) : (
          <span>Loading…</span>
        )}
      </div>
      <p className="fund-hint">
        Rewards are reserved from the available pool at launch. Deposit
        doubloons to make bigger voyages launchable.
      </p>
      <div className="fund-row">
        <input
          type="number"
          className="pixel-input"
          placeholder="Amount in dbl"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={connectedUser === null}
        />
        <button
          className="pixel-btn-sm"
          disabled={!canFund}
          onClick={handleFund}
        >
          {isApproving ? "Approving..." : isFunding ? "Depositing..." : "Fund"}
        </button>
      </div>
      {connectedUser === null && (
        <p className="fund-hint">Connect a wallet to deposit.</p>
      )}
      {message && <span className="toast-result">{message}</span>}
      {error && <span className="wallet-error">{error}</span>}
    </details>
  );
}
