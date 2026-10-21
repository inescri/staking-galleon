import { useEffect } from "react";
import { useGameDispatch } from "../contexts/useGame";
import type { DispatchedExpedition } from "../contexts/GameContext";
import { useWallet } from "../contexts/useWallet";
import { formatUnits } from "../utils/rewards";
import { TierIcon } from "./TierIcon";

export function DispatchToast({
  expedition,
}: {
  expedition: DispatchedExpedition;
}) {
  const dispatch = useGameDispatch();
  const { token } = useWallet();

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
      <span className="toast-icon">
        <TierIcon tier={expedition.tier} className="tier-icon-toast" />
      </span>
      <div className="toast-content">
        <span className="toast-title">Ship Dispatched!</span>
        <span className="toast-result">
          {formatUnits(expedition.stake, token)} taels staked
        </span>
      </div>
    </div>
  );
}
