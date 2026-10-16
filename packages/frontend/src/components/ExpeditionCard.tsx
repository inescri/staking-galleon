import { useEffect, useState, type CSSProperties } from "react";
import { useGameDispatch } from "../contexts/useGame";
import type { Expedition } from "../contexts/GameContext";
import { useWallet } from "../contexts/useWallet";
import { useCountdown } from "../hooks/useCountdown";
import { useGameCanister } from "../hooks/useGameCanister";
import {
  APP_CANISTER_ID,
  BTC_TOKEN_ID,
  PAYOUT_FEE_APPROVAL,
} from "../canister/config";
import { TIER_CONFIGS, formatBps, formatUnits } from "../utils/rewards";
import { TIER_ICONS } from "../utils/tierIcons";
import { ShipImage } from "./ShipImage";
import {
  approvalFor,
  claimRequest,
  type ApprovalReturnState,
} from "../odin/approvalFlow";

export function ExpeditionCard({ expedition }: { expedition: Expedition }) {
  const dispatch = useGameDispatch();
  const { settle, claim } = useGameCanister();
  const {
    connectedUser,
    identity,
    request,
    token,
    isRestoring,
    refreshBalances,
  } = useWallet();
  const [isReturning, setIsReturning] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);
  const config = TIER_CONFIGS[expedition.tier];

  const { minutes, seconds, progress, remainingMs, isComplete } = useCountdown(
    expedition.startedAt,
    expedition.durationMs,
  );

  // This ship's fee approval, if it is the SDK's latest request.
  const approval = approvalFor(request, "settle");
  const isApproving =
    approval?.returnState.shipId === expedition.id &&
    approval.request.status === "pending";
  const awaitingPayout = expedition.status === "payout_pending";
  // Stake pull still in flight: `startedAt` is 0, so the countdown is
  // meaningless until the next sync shows the ship sailing.
  const isLaunching = expedition.status === "launching";
  const locked =
    expedition.status === "settling" ||
    expedition.status === "paying" ||
    isLaunching;
  const busy = isApproving || isReturning || locked;

  // 1. Return Ship / Claim: approve the BTC ledger fee the canister pulls to
  //    fund the payout transfer. Not awaited (redirect mode); the effect
  //    below settles once the approval succeeds. Approving before the roll
  //    is harmless: an unused allowance costs nothing when the ship is lost.
  const handleReturn = () => {
    if (!connectedUser || busy) return;
    setReturnError(null);
    const returnState: ApprovalReturnState = {
      flow: "settle",
      shipId: expedition.id,
    };
    void connectedUser.icrcApprove({
      token: BTC_TOKEN_ID,
      spender: APP_CANISTER_ID,
      amount: PAYOUT_FEE_APPROVAL,
      returnState,
    });
  };

  // 2. When this ship's approval settles: roll the outcome (`settle`), or
  //    retry the transfer of an already-won payout (`claim`).
  useEffect(() => {
    const current = approvalFor(request, "settle");
    if (current === null || current.returnState.shipId !== expedition.id) {
      return;
    }
    const { id, status } = current.request;

    if (status === "rejected") {
      if (claimRequest(id)) setReturnError("Fee approval was rejected.");
      return;
    }
    if (status === "failed") {
      if (claimRequest(id)) {
        setReturnError(current.request.error ?? "Fee approval failed.");
      }
      return;
    }
    if (status !== "success") return;
    if (isRestoring) return;
    if (identity === null) {
      if (claimRequest(id)) {
        setReturnError(
          "Approved, but the wallet session has no delegation. Reconnect and try again.",
        );
      }
      return;
    }
    if (!claimRequest(id)) return;

    const shipId = expedition.shipId;
    const wasPending = expedition.status === "payout_pending";
    void (async () => {
      setIsReturning(true);
      setReturnError(null);
      try {
        if (wasPending) {
          const payout = await claim(shipId);
          dispatch({
            type: "SHIP_RETURNED",
            payload: {
              id: expedition.id,
              tier: expedition.tier,
              stake: expedition.stake,
              succeeded: true,
              payout,
              completedAt: Date.now(),
            },
          });
        } else {
          const outcome = await settle(shipId);
          if ("lost" in outcome) {
            dispatch({
              type: "SHIP_RETURNED",
              payload: {
                id: expedition.id,
                tier: expedition.tier,
                stake: expedition.stake,
                succeeded: false,
                payout: 0n,
                completedAt: Date.now(),
              },
            });
          } else if (outcome.won.paid) {
            dispatch({
              type: "SHIP_RETURNED",
              payload: {
                id: expedition.id,
                tier: expedition.tier,
                stake: expedition.stake,
                succeeded: true,
                payout: outcome.won.payout,
                completedAt: Date.now(),
              },
            });
          } else {
            setReturnError(
              "The ship made it back but the payout transfer failed. Press Claim Payout to retry.",
            );
          }
        }
        await refreshBalances();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Return failed";
        console.error("Return failed:", err);
        setReturnError(describeReturnError(message));
      } finally {
        setIsReturning(false);
      }
    })();
  }, [
    request,
    identity,
    isRestoring,
    expedition.id,
    expedition.shipId,
    expedition.status,
    expedition.tier,
    expedition.stake,
    settle,
    claim,
    dispatch,
    refreshBalances,
  ]);

  const actionLabel = isApproving
    ? "Approving fee..."
    : isReturning
      ? "Returning..."
      : isLaunching
        ? "Launching..."
        : expedition.status === "settling"
          ? "Rolling the dice..."
          : expedition.status === "paying"
            ? "Paying out..."
            : awaitingPayout
              ? "Claim Payout"
              : "Return Ship";

  const elapsedMs = isLaunching ? 0 : expedition.durationMs - remainingMs;

  return (
    <div
      className="expedition-card pixel-panel"
      style={
        {
          "--tier-art": `url(${TIER_ICONS[expedition.tier]})`,
          "--tier-color": config.color,
        } as CSSProperties
      }
    >
      <div className="expedition-header">
        <span className="expedition-tier">
          <ShipImage
            elapsedMs={elapsedMs}
            size={22}
            className="ship-image-card"
          />{" "}
          {config.name}
        </span>
        <span className="expedition-stake">
          &nbsp;{formatUnits(expedition.stake, token)} dbl
        </span>
        <span className="expedition-odds">
          {formatBps(expedition.failBps)} risk · +
          {formatBps(expedition.multiplierBps - 10_000)}
        </span>
      </div>
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{
            width: `${(isLaunching ? 0 : progress) * 100}%`,
            backgroundColor: config.color,
          }}
        />
      </div>
      <div className="expedition-footer">
        {isLaunching ? (
          <span className="expedition-time">Setting sail…</span>
        ) : isComplete || awaitingPayout ? (
          <>
            <span className="expedition-time">
              {awaitingPayout
                ? "Returned — payout pending"
                : "Voyage complete!"}
            </span>
            <div className="expedition-actions">
              <button
                className="pixel-btn-sm"
                disabled={busy}
                onClick={handleReturn}
              >
                {actionLabel}
              </button>
            </div>
          </>
        ) : (
          <span className="expedition-time">
            {minutes}:{seconds.toString().padStart(2, "0")} remaining
          </span>
        )}
      </div>
      {returnError && <span className="wallet-error">{returnError}</span>}
    </div>
  );
}

function describeReturnError(message: string): string {
  if (message.startsWith("SHIP_STILL_AT_SEA")) {
    return "The ship is not back yet — the chain's clock runs a few seconds behind. Try again shortly.";
  }
  if (message.startsWith("BAD_STATUS:settling")) {
    return "The outcome is still being rolled. Refresh in a moment.";
  }
  if (message.startsWith("PAYOUT_FAILED")) {
    return "Payout transfer failed. Check your BTC balance for the fee and press Claim Payout.";
  }
  return message;
}
