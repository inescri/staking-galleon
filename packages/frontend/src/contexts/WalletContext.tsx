import { useCallback, useEffect, useMemo, type ReactNode } from "react";
import type { OdinConnectedUser } from "odin-connect";
import { useGameDispatch } from "./useGame";
import { WalletContext, type WalletContextValue } from "./useWallet";
import { createStakingActor } from "../canister/actor";
import { STAKING_CANISTER_ID, TOKEN_ID } from "../canister/config";
import { odin } from "../odin/client";
import { useOdinState } from "../odin/useOdinState";
import { connectErrorMessage, deriveAuthStatus } from "../odin/authStatus";

function computeTokenBalance(token: {
  balance: bigint;
  decimals?: number;
  divisibility?: number;
}): number {
  if (!token) return 0;
  const decimals = token.decimals ?? 0;
  const divisibility = token.divisibility ?? 8;
  const divisor = Math.pow(10, divisibility + decimals);
  return Number(token.balance) / divisor;
}

/**
 * Wraps the app and exposes the Odin Connect session. All auth is delegated
 * to the `odin-connect` SDK: it owns the popup / redirect round trip,
 * verification and localStorage persistence. This provider only renders from
 * the SDK's state store (`useOdinState`) — it never awaits `connect()`, so the
 * same code works when a wallet in-app browser redirects to Odin and reloads.
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const state = useOdinState();
  const { user: connectedUser, request } = state;
  const status = deriveAuthStatus(state);
  const dispatch = useGameDispatch();

  const fetchBalancesAndPositions = useCallback(
    async (user: OdinConnectedUser) => {
      try {
        const tokenBalance = await user.getBalance(TOKEN_ID);
        if (tokenBalance) {
          dispatch({
            type: "SET_BALANCE",
            payload: computeTokenBalance(tokenBalance),
          });
        } else {
          dispatch({ type: "SET_BALANCE", payload: 0 });
        }
      } catch (err) {
        console.error("Failed to fetch token balances:", err);
        dispatch({ type: "SET_BALANCE", payload: 0 });
      }

      try {
        const delegationIdentity = user.getIdentity() ?? undefined;
        const actor = createStakingActor(delegationIdentity);
        const position = await actor.stake_get_position(TOKEN_ID);
        if (position.length > 0 && position[0]) {
          dispatch({ type: "SYNC_POSITIONS", payload: [position[0]] });
        } else {
          dispatch({ type: "SYNC_POSITIONS", payload: [] });
        }
      } catch (err) {
        console.error("Failed to fetch staking position:", err);
      }
    },
    [dispatch],
  );

  // Load balances whenever the connected user changes: a fresh connect, a
  // restored session, or a redirect result after reload.
  useEffect(() => {
    if (connectedUser) {
      void fetchBalancesAndPositions(connectedUser);
    }
  }, [connectedUser, fetchBalancesAndPositions]);

  const connectWallet = useCallback(() => {
    // Fire and forget: the outcome lands in `state` (popup or redirect). The
    // SDK never surfaces an unhandled rejection for an ignored promise.
    void odin.connect({
      requires_api: false,
      requires_delegation: true,
      targets: [STAKING_CANISTER_ID],
    });
  }, []);

  const refreshBalances = useCallback(async () => {
    if (connectedUser) {
      await fetchBalancesAndPositions(connectedUser);
    }
  }, [connectedUser, fetchBalancesAndPositions]);

  const disconnectWallet = useCallback(() => {
    odin.disconnect();
    dispatch({ type: "SET_BALANCE", payload: 0 });
  }, [dispatch]);

  const connectionError =
    status === "error" ? connectErrorMessage(request) : null;

  const value = useMemo<WalletContextValue>(
    () => ({
      connectedUser,
      identity: connectedUser?.getIdentity() ?? null,
      principal: connectedUser?.principal || "",
      isConnecting: status === "connecting",
      isRestoring: status === "restoring",
      connectionError,
      request,
      connectWallet,
      disconnectWallet,
      refreshBalances,
    }),
    [
      connectedUser,
      status,
      connectionError,
      request,
      connectWallet,
      disconnectWallet,
      refreshBalances,
    ],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}
