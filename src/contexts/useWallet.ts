import { createContext, useContext } from "react";
import type { Identity } from "@dfinity/agent";
import type { OdinConnectedUser } from "odin-connect";

export interface WalletContextValue {
  connectedUser: OdinConnectedUser | null;
  identity: Identity | null;
  principal: string;
  isConnecting: boolean;
  isRestoring: boolean;
  connectionError: string | null;
  connectWallet: () => Promise<void>;
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
