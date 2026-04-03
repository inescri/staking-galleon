import { useState } from "react";
import { useGameDispatch } from "../contexts/GameContext";

interface DepositModalProps {
  onClose: () => void;
}

export function DepositModal({ onClose }: DepositModalProps) {
  const dispatch = useGameDispatch();
  const [amount, setAmount] = useState(500);

  const canDeposit = amount > 0;

  const handleDeposit = () => {
    if (!canDeposit) return;
    dispatch({ type: "DEPOSIT_DOUBLOONS", payload: amount });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content pixel-panel" onClick={(e) => e.stopPropagation()}>
        <h2 className="section-title">Deposit Doubloons</h2>

        <div className="form-group">
          <label className="form-label">Amount</label>
          <input
            type="number"
            className="pixel-input"
            value={amount}
            min={1}
            onChange={(e) => setAmount(Number(e.target.value))}
            autoFocus
          />
        </div>

        <div className="percent-buttons">
          {[100, 250, 500, 1000].map((val) => (
            <button
              key={val}
              className="pixel-btn-sm"
              onClick={() => setAmount(val)}
            >
              {val}
            </button>
          ))}
        </div>

        <div className="modal-actions">
          <button
            className="pixel-btn launch-btn"
            disabled={!canDeposit}
            onClick={handleDeposit}
          >
            Deposit
          </button>
          <button className="pixel-btn-sm modal-cancel-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
