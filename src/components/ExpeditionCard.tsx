import { useState } from "react";
import { useGameDispatch } from "../contexts/useGame";
import type { Expedition } from "../contexts/GameContext";
import { useWallet, truncatePrincipal } from "../contexts/useWallet";
import { useCountdown } from "../hooks/useCountdown";
import { useStakingCanister } from "../hooks/useStakingCanister";
import { TOKEN_ID } from "../canister/actor";
import { TIER_CONFIGS, formatDoubloons } from "../utils/rewards";
import { ExtendModal } from "./ExtendModal";

export function ExpeditionCard({ expedition }: { expedition: Expedition }) {
  const dispatch = useGameDispatch();
  const { unlockAndWithdraw } = useStakingCanister();
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const { principal } = useWallet();
  const config = TIER_CONFIGS[expedition.tier];
  const owner = expedition.id.split(":").slice(1).join(":");
  const isOwner = owner === principal;

  const { minutes, seconds, progress, isComplete } = useCountdown(
    expedition.startedAt,
    expedition.durationMs,
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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Withdrawal failed";
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
          &nbsp;{formatDoubloons(expedition.stakeAmount)} dbl
        </span>
        <span className="expedition-principal">{truncatePrincipal(owner)}</span>
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
            {isOwner && (
              <div className="expedition-actions">
                <button
                  className="pixel-btn-sm"
                  onClick={() => setShowExtendModal(true)}
                >
                  Extend
                </button>
                <button
                  className="pixel-btn-sm"
                  disabled={isWithdrawing}
                  onClick={handleWithdraw}
                >
                  {isWithdrawing ? "Returning..." : "Return Ship"}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <span className="expedition-time">
              {minutes}:{seconds.toString().padStart(2, "0")} remaining
            </span>
            {isOwner && (
              <button
                className="pixel-btn-sm"
                onClick={() => setShowExtendModal(true)}
              >
                Extend
              </button>
            )}
          </>
        )}
      </div>
      {withdrawError && <span className="wallet-error">{withdrawError}</span>}
      {showExtendModal && (
        <ExtendModal
          expedition={expedition}
          onClose={() => setShowExtendModal(false)}
        />
      )}
    </div>
  );
}
