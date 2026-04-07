import { useWallet, truncatePrincipal } from "../contexts/useWallet";

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
        <div className="wallet-connect-row">
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
        <div className="wallet-connected-row">
          <div className="wallet-info">
            <span className="wallet-status-dot" />
            <span className="wallet-principal">{truncatePrincipal(principal)}</span>
          </div>
          
          <button
            className="pixel-btn-sm wallet-disconnect-btn"
            onClick={disconnectWallet}
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="wallet-connect-row">
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
