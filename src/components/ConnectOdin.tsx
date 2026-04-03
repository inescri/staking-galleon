import { useWallet, truncatePrincipal } from "../contexts/WalletContext";

export function ConnectOdin() {
  const {
    connectedUser,
    principal,
    isConnecting,
    connectionError,
    connectWallet,
    disconnectWallet,
  } = useWallet();

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
