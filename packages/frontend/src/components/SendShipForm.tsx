import { useEffect, useState, type CSSProperties } from "react";
import { useGameState, useGameDispatch } from "../contexts/useGame";
import { useWallet } from "../contexts/useWallet";
import {
  TIER_CONFIGS,
  TIERS,
  computePayout,
  formatBps,
  formatDurationMs,
  formatTl,
  rewardBps,
  type Tier,
} from "../utils/rewards";
import { useGameCanister } from "../hooks/useGameCanister";
import { APP_CANISTER_ID, TOKEN_ID } from "../canister/config";
import { TIER_ICONS } from "../utils/tierIcons";
import { launchErrorText } from "../utils/errors";
import { useLocale, useT } from "../i18n/useLocale";
import { resolveText, type UiText } from "../i18n/translate";
import { Icon } from "./Icon";
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
  const { locale } = useLocale();
  const t = useT();

  const [selectedTier, setSelectedTier] = useState<Tier>("coastal");
  const [durationIndex, setDurationIndex] = useState(0);
  const [isLaunching, setIsLaunching] = useState(false);
  const [approveError, setApproveError] = useState<UiText | null>(null);

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
      if (claimRequest(id)) {
        setApproveError({ key: "approval.rejected" });
      }
      return;
    }
    if (status === "failed") {
      if (claimRequest(id)) {
        setApproveError(
          current.request.error
            ? { raw: current.request.error }
            : { key: "approval.failed" },
        );
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
        setApproveError({ key: "send.error.noDelegation" });
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
        console.error("Launch failed:", err);
        setApproveError(launchErrorText(err));
      } finally {
        setIsLaunching(false);
      }
    })();
  }, [request, identity, isRestoring, launch, dispatch, refreshBalances]);

  const buttonLabel = isApproving
    ? t("approval.pending")
    : isLaunching
      ? t("send.dispatching")
      : APP_CANISTER_ID === ""
        ? t("send.notConfigured")
        : rules === null
          ? t("send.loadingCharts")
          : fleetFull
            ? t("send.fleetFull")
            : insufficient
              ? t("send.insufficient")
              : t("send.launch");

  return (
    <div className="send-ship-form pixel-panel">
      <h2 className="section-title">
        <Icon name="ship" />
        {t("send.title")}
      </h2>

      <div className="tier-selector">
        {TIERS.map((tier) => {
          const c = TIER_CONFIGS[tier];
          const name = t(`tier.${tier}`);
          return (
            <button
              key={tier}
              className={`tier-btn ${selectedTier === tier ? "active" : ""}`}
              style={
                {
                  backgroundImage: `url(${TIER_ICONS[tier]})`,
                  "--tier-color": c.color,
                } as CSSProperties
              }
              title={name}
              aria-pressed={selectedTier === tier}
              onClick={() => handleTierChange(tier)}
            >
              <span className="sr-only">{name}</span>
            </button>
          );
        })}
      </div>

      <div className="form-group">
        <span className="form-label">
          {t("send.stake", { tier: t(`tier.${selectedTier}`) })}
        </span>
        <div className="stake-fixed">
          {tierRules ? formatTl(tierRules.stake, token, locale) : "…"}
        </div>
      </div>

      <div className="form-group">
        <span className="form-label" id="voyage-label">
          {t("send.voyage")}
        </span>
        <div
          className="duration-menu"
          role="group"
          aria-labelledby="voyage-label"
        >
          {tierRules?.durations.map((d) => (
            <button
              key={d.index}
              className={`duration-btn ${durationIndex === d.index ? "active" : ""}`}
              onClick={() => setDurationIndex(d.index)}
            >
              <span className="duration-label">
                {formatDurationMs(d.durationMs, locale)}
              </span>
              <span className="duration-risk">
                {t("send.risk", { pct: formatBps(d.failBps) })}
              </span>
              <span className="duration-reward">
                +{formatBps(rewardBps(d.multiplierBps))}
              </span>
            </button>
          ))}
        </div>
        {tierRules && option && (
          <p className="duration-summary">
            {t("send.summary", {
              payout: formatTl(
                computePayout(tierRules.stake, option.multiplierBps),
                token,
                locale,
              ),
            })}
          </p>
        )}
      </div>

      <div className="launch-info">
        <span>
          {t("send.fleet", { count: atSea, max: rules?.maxShips ?? "…" })}
        </span>
        <span>
          {t("send.balance", {
            amount: formatTl(balanceUnits, token, locale),
          })}
        </span>
      </div>

      {approveError && (
        <span className="wallet-error">{resolveText(t, approveError)}</span>
      )}

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
