import { useEffect, useState } from "react";
import { useGameState, useGameDispatch } from "../contexts/useGame";
import { useWallet } from "../contexts/useWallet";
import {
  TIER_CONFIGS,
  TIERS,
  formatBps,
  formatUnits,
  type Tier,
} from "../utils/rewards";
import { useGameCanister } from "../hooks/useGameCanister";
import { APP_CANISTER_ID, TOKEN_ID } from "../canister/config";
import {
  approvalFor,
  claimRequest,
  type ApprovalReturnState,
} from "../odin/approvalFlow";

export function SendShipForm() {
  const { balanceUnits, activeExpeditions, rules } = useGameState();
  const dispatch = useGameDispatch();
  const {
    connectedUser,
    identity,
    request,
    token,
    isRestoring,
    refreshBalances,
  } = useWallet();
  const { launch } = useGameCanister();

  const [selectedTier, setSelectedTier] = useState<Tier>("coastal");
  const [durationIndex, setDurationIndex] = useState(0);
  const [isLaunching, setIsLaunching] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  // This flow's ICRC-2 approval, if it is the SDK's latest request.
  // 'approving' is derived from the SDK state, so it is right in both popup
  // and redirect mode (and simply absent after a redirect reload).
  const approval = approvalFor(request, "stake");
  const isApproving = approval?.request.status === "pending";
  const isLoading = isApproving || isLaunching;

  const tierRules = rules?.tiers[selectedTier];
  const option = tierRules?.durations[durationIndex];
  const atSea = activeExpeditions.filter(
    (e) =>
      e.status === "launching" ||
      e.status === "sailing" ||
      e.status === "settling",
  ).length;
  const fleetFull = rules !== null && atSea >= rules.maxShips;
  const insufficient =
    tierRules !== undefined && balanceUnits < tierRules.stake;

  const canLaunch =
    APP_CANISTER_ID !== "" &&
    rules !== null &&
    tierRules !== undefined &&
    option !== undefined &&
    !fleetFull &&
    !insufficient &&
    token !== null &&
    !isRestoring &&
    !isLoading;

  const handleTierChange = (tier: Tier) => {
    setSelectedTier(tier);
    setDurationIndex(0);
  };

  // 1. From the button: start the ICRC-2 approval of the game canister for
  //    the difficulty's fixed stake. Not awaited — in a wallet in-app browser
  //    the SDK redirects to Odin and the page reloads, so an awaited promise
  //    would never return. The result arrives as `request` and is handled by
  //    the effect below; the choice rides in `returnState`.
  const handleLaunch = () => {
    if (!canLaunch || !connectedUser || tierRules === undefined) return;

    setApproveError(null);
    const returnState: ApprovalReturnState = {
      flow: "stake",
      tier: selectedTier,
      durationIndex,
    };
    void connectedUser.icrcApprove({
      token: TOKEN_ID,
      spender: APP_CANISTER_ID,
      amount: tierRules.stake,
      returnState,
    });
  };

  // 2. When the approval settles (popup, or after the redirect reload): on
  //    success, launch the ship. The canister pulls its configured stake; the
  //    approval's "success" is only a UI signal.
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
    // Wait for the restored session and its first balance fetch; the effect
    // re-runs when they land.
    if (isRestoring) return;
    // The identity is fixed per connected user, so a missing delegation at
    // this point never appears later. Claim the approval and say so, instead
    // of leaving the button enabled to grant a second, dangling allowance.
    if (identity === null) {
      if (claimRequest(id)) {
        setApproveError(
          "Approved, but the wallet session has no delegation to launch " +
            "with. Reconnect and launch again.",
        );
      }
      return;
    }
    // At most once per approval: claimed before the await, so re-renders,
    // StrictMode and remounts cannot launch twice.
    if (!claimRequest(id)) return;

    const { tier, durationIndex: chosen } = current.returnState;
    void (async () => {
      setIsLaunching(true);
      setApproveError(null);
      try {
        const shipId = await launch(tier, chosen);
        dispatch({
          type: "SHIP_LAUNCHED",
          payload: { id: shipId.toString(), tier, stake: input.amount },
        });
        await refreshBalances();
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Launch failed. Please try again.";
        console.error("Launch failed:", err);
        setApproveError(describeLaunchError(message));
      } finally {
        setIsLaunching(false);
      }
    })();
  }, [request, identity, isRestoring, launch, dispatch, refreshBalances]);

  const buttonLabel = isApproving
    ? "Approving..."
    : isLaunching
      ? "Dispatching..."
      : APP_CANISTER_ID === ""
        ? "Canister not configured"
        : rules === null
          ? "Loading charts..."
          : fleetFull
            ? "Fleet Full"
            : insufficient
              ? "Insufficient Doubloons"
              : "⚓ Launch Expedition";

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
        <label className="form-label">Stake</label>
        <div className="stake-fixed">
          {tierRules ? `${formatUnits(tierRules.stake, token)} dbl` : "…"}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Voyage</label>
        <div className="duration-menu">
          {tierRules?.durations.map((d) => (
            <button
              key={d.index}
              className={`duration-btn ${durationIndex === d.index ? "active" : ""}`}
              onClick={() => setDurationIndex(d.index)}
            >
              <span className="duration-label">{d.label}</span>
              <span className="duration-risk">{formatBps(d.failBps)} risk</span>
              <span className="duration-reward">
                +{formatBps(d.multiplierBps - 10_000)}
              </span>
            </button>
          ))}
        </div>
        {tierRules && option && (
          <p className="duration-summary">
            Returns{" "}
            {formatUnits(
              tierRules.stake +
                (tierRules.stake * BigInt(option.multiplierBps - 10_000)) /
                  10_000n,
              token,
            )}{" "}
            dbl on success; the whole stake is lost otherwise.
          </p>
        )}
      </div>

      <div className="launch-info">
        <span>
          Fleet: {atSea}/{rules?.maxShips ?? "…"}
        </span>
        <span>Balance: {formatUnits(balanceUnits, token)} dbl</span>
      </div>

      {approveError && <span className="wallet-error">{approveError}</span>}

      <button
        className="pixel-btn launch-btn"
        disabled={!canLaunch}
        onClick={handleLaunch}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

/** Map the canister's stable error codes to player-facing text. */
function describeLaunchError(message: string): string {
  if (message.startsWith("POOL_INSUFFICIENT")) {
    return "The treasury cannot cover this voyage's reward yet. Try a smaller voyage or come back later.";
  }
  if (message.startsWith("FLEET_FULL")) return "Your fleet is full.";
  if (message.startsWith("PAUSED")) return "Launches are paused right now.";
  if (message.startsWith("PULL_FAILED")) {
    return "The stake could not be collected from your wallet. Check your balance and approval, then try again.";
  }
  return message;
}
