import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import {
  OdinConnect,
  type OdinConnectedUser,
  type OdinBalance,
} from "odin-connect";
import type { Identity } from "@dfinity/agent";
import { useGameDispatch } from "./GameContext";
import { createStakingActor, STAKING_CANISTER_ID, TOKEN_ID } from "../canister/actor";

interface WalletContextValue {
  connectedUser: OdinConnectedUser | null;
  identity: Identity | null;
  principal: string;
  tokenBalances: readonly OdinBalance[];
  isConnecting: boolean;
  connectionError: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  refreshBalances: () => Promise<void>;
  getTokenBalance: {
    (tokenId: string | number, mode: "full"): bigint;
    (tokenId: string | number, mode?: "display"): number;
  };
}

const WalletContext = createContext<WalletContextValue | null>(null);

const odinConnect = new OdinConnect({ name: "Galleon Stakes", env: "_preview" });

function truncatePrincipal(principal: string): string {
  if (!principal || principal.length <= 12) return principal;
  return principal.slice(0, 5) + "..." + principal.slice(-3);
}

function computeTokenBalance(token: OdinBalance): number {
  if (!token) return 0;
  const decimals = token.decimals ?? 0;
  const divisibility = token.divisibility ?? 8;
  const divisor = Math.pow(10, divisibility + decimals);
  return Number(token.balance) / divisor;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connectedUser, setConnectedUser] =
    useState<OdinConnectedUser | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [tokenBalances, setTokenBalances] = useState<readonly OdinBalance[]>(
    []
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const dispatch = useGameDispatch();

  const fetchBalancesAndPositions = useCallback(async (user: OdinConnectedUser) => {
    try {
      const balances = await user.getBalances({ page: 1, limit: 100 });
      const balanceList = Array.isArray(balances) ? balances : [];
      setTokenBalances(balanceList);

      const token2jjj = balanceList.find((b) => String(b.id) === TOKEN_ID);
      if (token2jjj) {
        dispatch({ type: "SET_BALANCE", payload: computeTokenBalance(token2jjj) });
      } else {
        dispatch({ type: "SET_BALANCE", payload: 0 });
      }
    } catch (err) {
      console.error("Failed to fetch token balances:", err);
      setTokenBalances([]);
      dispatch({ type: "SET_BALANCE", payload: 0 });
    }

    try {
      const delegationIdentity = user.getIdentity() ?? undefined;
      const actor = createStakingActor(delegationIdentity);
      const position = await actor.stake_get_position(TOKEN_ID);
      console.log("Fetched staking position:", position);
      if (position.length > 0 && position[0]) {
        dispatch({ type: "SYNC_POSITIONS", payload: [position[0]] });
      } else {
        dispatch({ type: "SYNC_POSITIONS", payload: [] });
      }
    } catch (err) {
      console.error("Failed to fetch staking position:", err);
    }
  }, [dispatch]);

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setConnectionError(null);
    try {
      const user = await odinConnect.connect({
        requires_api: false,
        requires_delegation: true,
        targets: [STAKING_CANISTER_ID],
      });
      setConnectedUser(user);
      setIdentity(user.getIdentity() ?? null);
      await fetchBalancesAndPositions(user);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Wallet connection failed";
      console.error("Wallet connection failed:", err);
      setConnectionError(message);
    } finally {
      setIsConnecting(false);
    }
  }, [fetchBalancesAndPositions]);

  const refreshBalances = useCallback(async () => {
    if (connectedUser) {
      await fetchBalancesAndPositions(connectedUser);
    }
  }, [connectedUser, fetchBalancesAndPositions]);

  const disconnectWallet = useCallback(() => {
    setConnectedUser(null);
    setIdentity(null);
    setTokenBalances([]);
    dispatch({ type: "SET_BALANCE", payload: 0 });
  }, [dispatch]);

  const getTokenBalance = useCallback(
    ((tokenId: string | number, mode: "display" | "full" = "display") => {
      const token = tokenBalances.find(
        (b) => String(b.id) === String(tokenId)
      );
      if (!token) return mode === "full" ? BigInt(0) : 0;
      return mode === "full" ? token.balance : computeTokenBalance(token);
    }) as WalletContextValue["getTokenBalance"],
    [tokenBalances]
  );

  const value: WalletContextValue = {
    connectedUser,
    identity,
    principal: connectedUser
      ? truncatePrincipal(connectedUser.principal || "Unknown")
      : "",
    tokenBalances,
    isConnecting,
    connectionError,
    connectWallet,
    disconnectWallet,
    refreshBalances,
    getTokenBalance,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (ctx === null)
    throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
