import { useState } from "react";
import { createPortal } from "react-dom";
import { useGameDispatch, type Expedition } from "../contexts/GameContext";
import { useStakingCanister } from "../hooks/useStakingCanister";
import { useWallet } from "../contexts/WalletContext";
import { TOKEN_ID } from "../canister/actor";
import { TIER_CONFIGS } from "../utils/rewards";
import { useCountdown } from "../hooks/useCountdown";

interface ExtendModalProps {
  expedition: Expedition;
  onClose: () => void;
}

export function ExtendModal({ expedition, onClose }: ExtendModalProps) {
  const dispatch = useGameDispatch();
  const { increaseDuration } = useStakingCanister();
  const { refreshBalances } = useWallet();
  const config = TIER_CONFIGS[expedition.tier];

  const [extensionSec, setExtensionSec] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { minutes, seconds, isComplete } = useCountdown(
    expedition.startedAt,
    expedition.durationMs
  );

  const extMin = Math.floor(extensionSec / 60);
  const extSec = extensionSec % 60;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await increaseDuration(TOKEN_ID, BigInt(extensionSec * 1000));
      dispatch({
        type: "EXTEND_EXPEDITION",
        payload: {
          id: expedition.id,
          additionalDurationMs: extensionSec * 1000,
        },
      });
      await refreshBalances();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to extend expedition";
      console.error("Extend failed:", err);
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content pixel-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="section-title">Extend Voyage</h3>

        <div className="modal-expedition-info">
          <span>
            {config.emoji} {config.name}
          </span>
          <span className="expedition-time">
            {isComplete
              ? "Voyage complete"
              : `${minutes}:${seconds.toString().padStart(2, "0")} remaining`}
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">
            Extend by:{" "}
            <span className="duration-display">
              {extMin > 0 ? `${extMin}m ` : ""}
              {extSec}s
            </span>
          </label>
          <input
            type="range"
            className="pixel-slider"
            min={30}
            max={600}
            value={extensionSec}
            onChange={(e) => setExtensionSec(Number(e.target.value))}
          />
          <div className="slider-labels">
            <span>0m 30s</span>
            <span>10m 0s</span>
          </div>
        </div>

        {error && <span className="wallet-error">{error}</span>}

        <div className="modal-actions">
          <button className="pixel-btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className="pixel-btn-sm modal-confirm-btn"
            disabled={isSubmitting}
            onClick={handleConfirm}
          >
            {isSubmitting ? "Extending..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
