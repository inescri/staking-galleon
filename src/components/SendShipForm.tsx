import { useState } from "react";
import { useGameState, useGameDispatch } from "../contexts/GameContext";
import { TIER_CONFIGS, formatDoubloons, type Tier } from "../utils/rewards";

const TIERS: Tier[] = ["coastal", "open_sea", "deep_ocean", "kraken_waters"];

export function SendShipForm() {
  const { balance, activeExpeditions } = useGameState();
  const dispatch = useGameDispatch();

  const [selectedTier, setSelectedTier] = useState<Tier>("coastal");
  const [stakeAmount, setStakeAmount] = useState(100);
  const [duration, setDuration] = useState(30);

  const config = TIER_CONFIGS[selectedTier];
  const canLaunch =
    stakeAmount > 0 &&
    stakeAmount <= balance &&
    activeExpeditions.length < 5 &&
    duration >= config.minDuration &&
    duration <= config.maxDuration;

  const handleTierChange = (tier: Tier) => {
    setSelectedTier(tier);
    const c = TIER_CONFIGS[tier];
    setDuration(c.minDuration);
    if (stakeAmount > balance) setStakeAmount(Math.floor(balance));
  };

  const handleLaunch = () => {
    if (!canLaunch) return;
    dispatch({
      type: "LAUNCH_EXPEDITION",
      payload: {
        stakeAmount,
        durationMs: duration * 1000,
        tier: selectedTier,
      },
    });
    setStakeAmount(Math.min(100, Math.floor(balance - stakeAmount)));
  };

  const setPercent = (pct: number) => {
    setStakeAmount(Math.floor(balance * pct));
  };

  const durationMin = Math.floor(duration / 60);
  const durationSec = duration % 60;

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
        <label className="form-label">Stake Amount</label>
        <div className="stake-input-row">
          <input
            type="number"
            className="pixel-input"
            value={stakeAmount}
            min={1}
            max={balance}
            onChange={(e) => setStakeAmount(Number(e.target.value))}
          />
          <span className="input-suffix">dbl</span>
        </div>
        <div className="percent-buttons">
          {[0.25, 0.5, 0.75, 1].map((pct) => (
            <button
              key={pct}
              className="pixel-btn-sm"
              onClick={() => setPercent(pct)}
            >
              {pct * 100}%
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          Voyage Duration:{" "}
          <span className="duration-display">
            {durationMin > 0 ? `${durationMin}m ` : ""}
            {durationSec}s
          </span>
        </label>
        <input
          type="range"
          className="pixel-slider"
          min={config.minDuration}
          max={config.maxDuration}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        />
        <div className="slider-labels">
          <span>{Math.floor(config.minDuration / 60)}m {config.minDuration % 60}s</span>
          <span>{Math.floor(config.maxDuration / 60)}m {config.maxDuration % 60}s</span>
        </div>
      </div>

      <div className="launch-info">
        <span>
          Fleet: {activeExpeditions.length}/5
        </span>
        <span>
          Balance: {formatDoubloons(balance)} dbl
        </span>
      </div>

      <button
        className="pixel-btn launch-btn"
        disabled={!canLaunch}
        onClick={handleLaunch}
      >
        {activeExpeditions.length >= 5
          ? "Fleet Full"
          : stakeAmount > balance
          ? "Insufficient Doubloons"
          : "\u2693 Launch Expedition"}
      </button>
    </div>
  );
}
