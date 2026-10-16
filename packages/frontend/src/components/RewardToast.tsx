import { useEffect } from "react";
import { useGameDispatch } from "../contexts/useGame";
import type { CompletedExpedition } from "../contexts/GameContext";
import { useWallet } from "../contexts/useWallet";
import { TIER_CONFIGS, formatUnits } from "../utils/rewards";

export function RewardToast({
  expedition,
}: {
  expedition: CompletedExpedition;
}) {
  const dispatch = useGameDispatch();
  const { token } = useWallet();
  const config = TIER_CONFIGS[expedition.tier];

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch({ type: "DISMISS_RETURN", payload: { id: expedition.id } });
    }, 5000);
    return () => clearTimeout(timer);
  }, [dispatch, expedition.id]);

  const won = expedition.succeeded;
  const profit = expedition.payout - expedition.stake;

  return (
    <div
      className={`reward-toast ${won ? "toast-profit" : "toast-loss"}`}
      onClick={() =>
        dispatch({ type: "DISMISS_RETURN", payload: { id: expedition.id } })
      }
    >
      <span className="toast-icon">{won ? config.emoji : "\u{1F480}"}</span>
      <div className="toast-content">
        <span className="toast-title">
          {won ? "Ship Returned!" : "Lost at Sea!"}
        </span>
        <span className="toast-result">
          {won
            ? `+${formatUnits(profit, token)} dbl bounty (${formatUnits(expedition.payout, token)} returned)`
            : `−${formatUnits(expedition.stake, token)} dbl went down with the ship`}
        </span>
      </div>
    </div>
  );
}
