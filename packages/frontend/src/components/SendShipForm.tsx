import { useEffect, useState } from "react";
import { useGameState, useGameDispatch } from "../contexts/useGame";
import { useWallet } from "../contexts/useWallet";
import { TIER_CONFIGS, formatDoubloons, type Tier } from "../utils/rewards";
import { OdinUtils } from "odin-connect";
import { useStakingCanister } from "../hooks/useStakingCanister";
import { STAKING_CANISTER_ID, TOKEN_ID } from "../canister/config";
import {
  approvalFor,
  claimRequest,
  type ApprovalReturnState,
} from "../odin/approvalFlow";

const TIERS: Tier[] = ["coastal", "open_sea", "deep_ocean", "kraken_waters"];

export function SendShipForm() {
  const { balance, activeExpeditions } = useGameState();
  const dispatch = useGameDispatch();
  const { connectedUser, identity, principal, request, refreshBalances } =
    useWallet();
  const { depositAndLock } = useStakingCanister();

  const [selectedTier, setSelectedTier] = useState<Tier>("coastal");
  const [stakeAmount, setStakeAmount] = useState(100);
  const [duration, setDuration] = useState(30);
  const [isStaking, setIsStaking] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  // This flow's ICRC-2 approval, if it is the SDK's latest request.
  // 'approving' is derived from the SDK state, so it is right in both popup
  // and redirect mode (and simply absent after a redirect reload).
  const approval = approvalFor(request, "stake");
  const isApproving = approval?.request.status === "pending";
  const isLoading = isApproving || isStaking;

  const config = TIER_CONFIGS[selectedTier];
  const canLaunch =
    stakeAmount > 0 &&
    stakeAmount <= balance &&
    activeExpeditions.length < 5 &&
    duration >= config.minDuration &&
    duration <= config.maxDuration &&
    !isLoading;

  const handleTierChange = (tier: Tier) => {
    setSelectedTier(tier);
    const c = TIER_CONFIGS[tier];
    setDuration(c.minDuration);
    if (stakeAmount > balance) setStakeAmount(Math.floor(balance));
  };

  // 1. From the button: start the ICRC-2 approval of the staking canister.
  //    Not awaited — in a wallet in-app browser the SDK redirects to Odin and
  //    the page reloads, so an awaited promise would never return. The result
  //    arrives as `request` and is handled by the effect below. Everything
  //    the follow-up needs beyond the approved amount rides in `returnState`.
  const handleLaunch = () => {
    if (!canLaunch || !connectedUser) return;

    setApproveError(null);
    const onChainAmount = OdinUtils.convertToOdinAmount(stakeAmount, {
      decimals: 3,
      divisibility: 8,
    });
    const returnState: ApprovalReturnState = {
      flow: "stake",
      tier: selectedTier,
      durationMs: duration * 1000,
      stakeAmount,
    };
    void connectedUser.icrcApprove({
      token: TOKEN_ID,
      spender: STAKING_CANISTER_ID,
      amount: onChainAmount,
      returnState,
    });
  };

  // 2. When the approval settles (popup, or after the redirect reload): on
  //    success, lock the approved amount in the staking canister. The amount
  //    comes from `request.input`, the rest from `returnState` — not from
  //    form state, which a redirect wipes. "success" is only a UI signal;
  //    the canister's icrc2_transfer_from is the on-chain check.
  useEffect(() => {
    const current = approvalFor(request, "stake");
    if (current === null) return;
    const { id, status, input } = current.request;

    if (status === "rejected") {
      if (claimRequest(id)) setApproveError("Approval was rejected.");
      return;
    }
    if (status === "failed") {
      if (claimRequest(id)) {
        setApproveError(current.request.error ?? "Approval failed.");
      }
      return;
    }
    if (status !== "success") return;
    // After a redirect reload the delegation identity is still being
    // restored; this effect re-runs once it exists.
    if (identity === null) return;
    // At most once per approval: claimed before the await, so re-renders,
    // StrictMode and remounts cannot stake twice.
    if (!claimRequest(id)) return;

    const { tier, durationMs, stakeAmount: amount } = current.returnState;
    void (async () => {
      setIsStaking(true);
      setApproveError(null);
      try {
        await depositAndLock(TOKEN_ID, input.amount, BigInt(durationMs));
        dispatch({
          type: "LAUNCH_EXPEDITION",
          payload: {
            id: `${TOKEN_ID}:${principal}`,
            stakeAmount: amount,
            durationMs,
            tier,
          },
        });
        setStakeAmount(Math.min(100, Math.floor(balance - amount)));
        await refreshBalances();
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Staking failed. Please try again.";
        console.error("Staking failed:", err);
        setApproveError(message);
      } finally {
        setIsStaking(false);
      }
    })();
  }, [
    request,
    identity,
    principal,
    balance,
    depositAndLock,
    dispatch,
    refreshBalances,
  ]);

  const setPercent = (pct: number) => {
    setStakeAmount(Math.floor(balance * pct));
  };

  const durationMin = Math.floor(duration / 60);
  const durationSec = duration % 60;

  return (
    <div className="send-ship-form pixel-panel">
      <h2 className="section-title">Send a Ship</h2>

      <div className="tier-selector">
        {TIERS.map((tier) => {
          const c = TIER_CONFIGS[tier];
          return (
            <button
              key={tier}
              className={`tier-btn ${selectedTier === tier ? "active" : ""}`}
              style={
                selectedTier === tier
                  ? { borderColor: c.color, color: c.color }
                  : undefined
              }
              onClick={() => handleTierChange(tier)}
            >
              <span className="tier-emoji">{c.emoji}</span>
              <span className="tier-name">{c.name}</span>
            </button>
          );
        })}
      </div>

      <div className="form-group">
        <label className="form-label">Stake Amount</label>
        <div className="stake-input-row">
          <input
            type="number"
            className="pixel-input"
            value={stakeAmount}
            min={1}
            max={balance}
            onChange={(e) => setStakeAmount(Number(e.target.value))}
          />
          <span className="input-suffix">dbl</span>
        </div>
        <div className="percent-buttons">
          {[0.25, 0.5, 0.75, 1].map((pct) => (
            <button
              key={pct}
              className="pixel-btn-sm"
              onClick={() => setPercent(pct)}
            >
              {pct * 100}%
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          Voyage Duration:{" "}
          <span className="duration-display">
            {durationMin > 0 ? `${durationMin}m ` : ""}
            {durationSec}s
          </span>
        </label>
        <input
          type="range"
          className="pixel-slider"
          min={config.minDuration}
          max={config.maxDuration}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        />
        <div className="slider-labels">
          <span>
            {Math.floor(config.minDuration / 60)}m {config.minDuration % 60}s
          </span>
          <span>
            {Math.floor(config.maxDuration / 60)}m {config.maxDuration % 60}s
          </span>
        </div>
      </div>

      <div className="launch-info">
        <span>Fleet: {activeExpeditions.length}/5</span>
        <span>Balance: {formatDoubloons(balance)} dbl</span>
      </div>

      {approveError && <span className="wallet-error">{approveError}</span>}

      <button
        className="pixel-btn launch-btn"
        disabled={!canLaunch}
        onClick={handleLaunch}
      >
        {isApproving
          ? "Approving..."
          : isStaking
            ? "Dispatching..."
            : activeExpeditions.length >= 5
              ? "Fleet Full"
              : stakeAmount > balance
                ? "Insufficient Doubloons"
                : "\u2693 Launch Expedition"}
      </button>
    </div>
  );
}
