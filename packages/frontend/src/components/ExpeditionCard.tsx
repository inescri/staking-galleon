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
import {
  TIER_CONFIGS,
  formatBps,
  formatRemainingMs,
  formatTl,
  rewardBps,
} from "../utils/rewards";
import { TIER_ICONS } from "../utils/tierIcons";
import { returnErrorText } from "../utils/errors";
import { useLocale, useT } from "../i18n/useLocale";
import { resolveText, type UiText } from "../i18n/translate";
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
  const [returnError, setReturnError] = useState<UiText | null>(null);
  const { locale } = useLocale();
  const t = useT();
  const config = TIER_CONFIGS[expedition.tier];

  const { remainingMs, progress, elapsedMs, isComplete } = useCountdown(
    expedition.startedAt,
    expedition.durationMs,
  );

  // This ship's fee approval, if it is the SDK's latest request.
  const approval = approvalFor(request, "settle");
  const isApproving =
    approval?.returnState.shipId === expedition.id &&
    approval.request.status === "pending";
  const awaitingPayout = expedition.status === "payout_pending";
  // Stake pull still in flight: `startedAt` is 0 and the countdown has not
  // begun until the next sync shows the ship sailing.
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
      if (claimRequest(id)) setReturnError({ key: "card.error.feeRejected" });
      return;
    }
    if (status === "failed") {
      if (claimRequest(id)) {
        setReturnError(
          current.request.error
            ? { raw: current.request.error }
            : { key: "card.error.feeFailed" },
        );
      }
      return;
    }
    if (status !== "success") return;
    if (isRestoring) return;
    if (identity === null) {
      if (claimRequest(id)) {
        setReturnError({ key: "error.noDelegation" });
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
            setReturnError({ key: "card.error.transferFailed" });
          }
        }
        await refreshBalances();
      } catch (err) {
        console.error("Return failed:", err);
        setReturnError(returnErrorText(err));
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
    ? t("card.approvingFee")
    : isReturning
      ? t("card.returning")
      : isLaunching
        ? t("card.launching")
        : expedition.status === "settling"
          ? t("card.rolling")
          : expedition.status === "paying"
            ? t("card.paying")
            : awaitingPayout
              ? t("card.claim")
              : t("card.return");

  return (
    <div
      className="expedition-card pixel-panel"
      style={
        {
          "--tier-art": `url("${TIER_ICONS[expedition.tier]}")`,
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
          {t(`tier.${expedition.tier}`)}
        </span>
        <span className="expedition-odds">
          {t("card.risk", {
            pct: formatBps(expedition.failBps),
            reward: formatBps(rewardBps(expedition.multiplierBps)),
          })}
        </span>
      </div>
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{
            width: `${progress * 100}%`,
            backgroundColor: config.color,
          }}
        />
      </div>
      <div className="expedition-footer">
        <span className="expedition-stake">
          {formatTl(expedition.stake, token, locale)}
        </span>
        {isLaunching ? (
          <span className="expedition-time">{t("card.settingSail")}</span>
        ) : isComplete || awaitingPayout ? (
          <div className="expedition-status">
            <span className="expedition-time">
              {awaitingPayout ? t("card.payoutPending") : t("card.complete")}
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
          </div>
        ) : (
          <span className="expedition-time">
            {formatRemainingMs(remainingMs, locale)}
          </span>
        )}
      </div>
      {returnError && (
        <span className="wallet-error">{resolveText(t, returnError)}</span>
      )}
    </div>
  );
}
