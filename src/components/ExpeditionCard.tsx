import { useCallback } from "react";
import { useGameDispatch, type Expedition } from "../contexts/GameContext";
import { useCountdown } from "../hooks/useCountdown";
import { TIER_CONFIGS, formatDoubloons } from "../utils/rewards";

export function ExpeditionCard({ expedition }: { expedition: Expedition }) {
  const dispatch = useGameDispatch();
  const config = TIER_CONFIGS[expedition.tier];

  const onComplete = useCallback(() => {
    dispatch({
      type: "COMPLETE_EXPEDITION",
      payload: { id: expedition.id },
    });
  }, [dispatch, expedition.id]);

  const { minutes, seconds, progress } = useCountdown(
    expedition.startedAt,
    expedition.durationMs,
    onComplete
  );

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
        <span className="expedition-time">
          {minutes}:{seconds.toString().padStart(2, "0")} remaining
        </span>
        <span className="expedition-progress">
          {Math.round(progress * 100)}%
        </span>
      </div>
    </div>
  );
}
