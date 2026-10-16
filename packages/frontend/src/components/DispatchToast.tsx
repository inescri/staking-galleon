import { useEffect } from "react";
import { useGameDispatch } from "../contexts/useGame";
import type { DispatchedExpedition } from "../contexts/GameContext";
import { TIER_CONFIGS, formatDoubloons } from "../utils/rewards";

export function DispatchToast({
  expedition,
}: {
  expedition: DispatchedExpedition;
}) {
  const dispatch = useGameDispatch();
  const config = TIER_CONFIGS[expedition.tier];

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch({ type: "DISMISS_DISPATCH", payload: { id: expedition.id } });
    }, 4000);
    return () => clearTimeout(timer);
  }, [dispatch, expedition.id]);

  return (
    <div
      className="reward-toast toast-dispatched"
      onClick={() =>
        dispatch({ type: "DISMISS_DISPATCH", payload: { id: expedition.id } })
      }
    >
      <span className="toast-icon">{config.emoji}</span>
      <div className="toast-content">
        <span className="toast-title">Ship Dispatched!</span>
        <span className="toast-result">
          {formatDoubloons(expedition.stakeAmount)} doubloons staked
        </span>
      </div>
    </div>
  );
}
