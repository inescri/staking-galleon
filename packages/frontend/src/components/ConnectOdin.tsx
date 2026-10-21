import { useWallet, truncatePrincipal } from "../contexts/useWallet";
import { Icon } from "./Icon";

export function ConnectOdin() {
  const {
    connectedUser,
    principal,
    isConnecting,
    isRestoring,
    connectionError,
    connectWallet,
    disconnectWallet,
  } = useWallet();

  if (isRestoring) {
    return (
      <div className="wallet-row">
        <div className="wallet-connect-row pixel-panel">
          <button className="pixel-btn wallet-connect-btn" disabled>
            Loading...
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-row">
      {connectedUser ? (
        <div className="wallet-connected-row pixel-panel">
          <div className="wallet-info">
            <Icon name="wallet" size={18} className="wallet-icon" />
            <span className="wallet-principal">
              {truncatePrincipal(principal)}
            </span>
          </div>

          <button
            className="btn-outline wallet-disconnect-btn"
            onClick={disconnectWallet}
          >
            <Icon name="link-off" size={14} />
            Disconnect
          </button>
        </div>
      ) : (
        <div className="wallet-connect-row pixel-panel">
          <button
            className="pixel-btn wallet-connect-btn"
            onClick={connectWallet}
            disabled={isConnecting}
          >
            {isConnecting ? "Connecting..." : "Connect Odin"}
          </button>
          {connectionError && (
            <span className="wallet-error">{connectionError}</span>
          )}
        </div>
      )}
    </div>
  );
}
