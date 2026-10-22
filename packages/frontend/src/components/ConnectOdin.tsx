import { useWallet, truncatePrincipal } from "../contexts/useWallet";
import { useT } from "../i18n/useLocale";
import { resolveText } from "../i18n/translate";
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
  const t = useT();

  if (isRestoring) {
    return (
      <div className="wallet-row">
        <div className="wallet-connect-row pixel-panel">
          <button className="pixel-btn wallet-connect-btn" disabled>
            {t("wallet.loading")}
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
            {t("wallet.disconnect")}
          </button>
        </div>
      ) : (
        <div className="wallet-connect-row pixel-panel">
          <button
            className="pixel-btn wallet-connect-btn"
            onClick={connectWallet}
            disabled={isConnecting}
          >
            {isConnecting ? t("wallet.connecting") : t("wallet.connect")}
          </button>
          {connectionError && (
            <span className="wallet-error">
              {resolveText(t, connectionError)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
