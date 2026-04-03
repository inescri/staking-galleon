import { useState } from "react";
import { useGameDispatch, type Expedition } from "../contexts/GameContext";
import { useWallet } from "../contexts/WalletContext";
import { useCountdown } from "../hooks/useCountdown";
import { useStakingCanister } from "../hooks/useStakingCanister";
import { TOKEN_ID } from "../canister/actor";
import { TIER_CONFIGS, formatDoubloons } from "../utils/rewards";

export function ExpeditionCard({ expedition }: { expedition: Expedition }) {
  const dispatch = useGameDispatch();
  const { refreshBalances } = useWallet();
  const { unlockAndWithdraw } = useStakingCanister();
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const config = TIER_CONFIGS[expedition.tier];

  const { minutes, seconds, progress, isComplete } = useCountdown(
    expedition.startedAt,
    expedition.durationMs
  );

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    setWithdrawError(null);
    try {
      await unlockAndWithdraw(TOKEN_ID);
      dispatch({
        type: "RETURN_EXPEDITION",
        payload: { id: expedition.id },
      });
      await new Promise((resolve) => setTimeout(resolve, 2000)); // wait for state to update on-chai
      await refreshBalances();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Withdrawal failed";
      console.error("Withdraw failed:", err);
      setWithdrawError(message);
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="expedition-card pixel-panel">
      <div className="expedition-header">
        <span className="expedition-tier">
          {config.emoji} {config.name}
        </span>
        <span className="expedition-stake">
          {formatDoubloons(expedition.stakeAmount)} dbl
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
        {isComplete ? (
          <>
            <span className="expedition-time">Voyage complete!</span>
            <button
              className="pixel-btn-sm"
              disabled={isWithdrawing}
              onClick={handleWithdraw}
            >
              {isWithdrawing ? "Returning..." : "Return Ship"}
            </button>
          </>
        ) : (
          <>
            <span className="expedition-time">
              {minutes}:{seconds.toString().padStart(2, "0")} remaining
            </span>
            <span className="expedition-progress">
              {Math.round(progress * 100)}%
            </span>
          </>
        )}
      </div>
      {withdrawError && (
        <span className="wallet-error">{withdrawError}</span>
      )}
    </div>
  );
}
