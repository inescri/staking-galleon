import { useState } from "react";
import { useGameState, useGameDispatch } from "../contexts/GameContext";
import { useWallet } from "../contexts/WalletContext";
import { TIER_CONFIGS, formatDoubloons, type Tier } from "../utils/rewards";
import { convertToOdinAmount } from "odin-connect/dist/utils";
import { useStakingCanister } from "../hooks/useStakingCanister";
import { STAKING_CANISTER_ID, TOKEN_ID } from "../canister/actor";

const TIERS: Tier[] = ["coastal", "open_sea", "deep_ocean", "kraken_waters"];

export function SendShipForm() {
  const { balance, activeExpeditions } = useGameState();
  const dispatch = useGameDispatch();
  const { connectedUser } = useWallet();
  const { depositAndLock, isLoading: isStaking } = useStakingCanister();

  const [selectedTier, setSelectedTier] = useState<Tier>("coastal");
  const [stakeAmount, setStakeAmount] = useState(100);
  const [duration, setDuration] = useState(30);
  const [isApproving, setIsApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  const config = TIER_CONFIGS[selectedTier];
  const canLaunch =
    stakeAmount > 0 &&
    stakeAmount <= balance &&
    activeExpeditions.length < 5 &&
    duration >= config.minDuration &&
    duration <= config.maxDuration &&
    !isApproving &&
    !isStaking;

  const handleTierChange = (tier: Tier) => {
    setSelectedTier(tier);
    const c = TIER_CONFIGS[tier];
    setDuration(c.minDuration);
    if (stakeAmount > balance) setStakeAmount(Math.floor(balance));
  };

  const handleLaunch = async () => {
    if (!canLaunch || !connectedUser) return;

    setIsApproving(true);
    setApproveError(null);
    try {
      const onChainAmount = convertToOdinAmount(stakeAmount, {
        decimals: 3, divisibility: 8,
      });

      const approved = await connectedUser.icrcApprove({
        token: TOKEN_ID,
        spender: STAKING_CANISTER_ID,
        amount: onChainAmount,
      });

      if (!approved) {
        setApproveError("Approval was rejected.");
        return;
      }

      const durationMs = duration * 1000;
      await depositAndLock(TOKEN_ID, BigInt(onChainAmount), BigInt(durationMs));

      dispatch({
        type: "LAUNCH_EXPEDITION",
        payload: {
          stakeAmount,
          durationMs,
          tier: selectedTier,
        },
      });
      setStakeAmount(Math.min(100, Math.floor(balance - stakeAmount)));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Staking failed. Please try again.";
      console.error("Staking failed:", err);
      setApproveError(message);
    } finally {
      setIsApproving(false);
    }
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

      {approveError && (
        <span className="wallet-error">{approveError}</span>
      )}

      <button
        className="pixel-btn launch-btn"
        disabled={!canLaunch}
        onClick={handleLaunch}
      >
        {isStaking
          ? "Staking..."
          : isApproving
          ? "Approving..."
          : activeExpeditions.length >= 5
          ? "Fleet Full"
          : stakeAmount > balance
          ? "Insufficient Doubloons"
          : "\u2693 Launch Expedition"}
      </button>
    </div>
  );
}
