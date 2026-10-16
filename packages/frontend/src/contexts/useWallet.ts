import { createContext, useContext } from "react";
import type { Identity } from "@dfinity/agent";
import type {
  OdinBalance,
  OdinConnectedUser,
  OdinRequestState,
} from "odin-connect";

/** The staked token's on-chain units, from the fetched balance. */
export type TokenUnits = Pick<OdinBalance, "decimals" | "divisibility">;

export interface WalletContextValue {
  connectedUser: OdinConnectedUser | null;
  identity: Identity | null;
  principal: string;
  isConnecting: boolean;
  /**
   * True while the stored session is being restored and until the connected
   * user's balance and ships have been fetched once, so the connected UI
   * never renders with a placeholder balance of 0.
   */
  isRestoring: boolean;
  /** Units of the staked token; null until a balance has been fetched. */
  token: TokenUnits | null;
  connectionError: string | null;
  /**
   * The latest `connect()` or action (`user.icrcApprove()`, …) and its
   * outcome, straight from the SDK state. Flows react to it instead of
   * awaiting the call: in redirect mode the page reloads before an awaited
   * promise could return.
   */
  request: OdinRequestState | null;
  /** Start a connect; the outcome arrives through `isConnecting` / `connectionError` / `connectedUser`. */
  connectWallet: () => void;
  disconnectWallet: () => void;
  refreshBalances: () => Promise<void>;
}

export const WalletContext = createContext<WalletContextValue | null>(null);

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (ctx === null)
    throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

export function truncatePrincipal(principal: string): string {
  if (!principal || principal.length <= 12) return principal;
  return principal.slice(0, 5) + "..." + principal.slice(-3);
}
