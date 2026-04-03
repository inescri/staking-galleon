import { useEffect } from "react";
import { useGameDispatch, type CompletedExpedition } from "../contexts/GameContext";
import { TIER_CONFIGS, formatDoubloons } from "../utils/rewards";

export function RewardToast({
  expedition,
}: {
  expedition: CompletedExpedition;
}) {
  const dispatch = useGameDispatch();
  const config = TIER_CONFIGS[expedition.tier];
  const profit = expedition.reward - expedition.stakeAmount;
  const isProfit = profit >= 0;
  const multiplier = (expedition.reward / expedition.stakeAmount).toFixed(2);

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch({ type: "DISMISS_RETURN", payload: { id: expedition.id } });
    }, 4000);
    return () => clearTimeout(timer);
  }, [dispatch, expedition.id]);

  return (
    <div
      className={`reward-toast ${isProfit ? "toast-profit" : "toast-loss"}`}
      onClick={() =>
        dispatch({ type: "DISMISS_RETURN", payload: { id: expedition.id } })
      }
    >
      <span className="toast-icon">{config.emoji}</span>
      <div className="toast-content">
        <span className="toast-title">Ship Returned!</span>
        <span className="toast-result">
          {isProfit ? "+" : ""}
          {formatDoubloons(profit)} doubloons ({multiplier}x)
        </span>
      </div>
    </div>
  );
}
