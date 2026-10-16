import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { OdinBalance, OdinConnectedUser } from "odin-connect";
import { useGameDispatch } from "./useGame";
import {
  WalletContext,
  type TokenUnits,
  type WalletContextValue,
} from "./useWallet";
import { createStakingActor } from "../canister/actor";
import { STAKING_CANISTER_ID, TOKEN_ID } from "../canister/config";
import { odin } from "../odin/client";
import { useOdinState } from "../odin/useOdinState";
import { connectErrorMessage, deriveAuthStatus } from "../odin/authStatus";

function computeTokenBalance(token: OdinBalance): number {
  const divisor = Math.pow(10, token.divisibility + token.decimals);
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
  const [token, setToken] = useState<TokenUnits | null>(null);
  // The user whose balance and position have been fetched at least once.
  const [hydratedUser, setHydratedUser] = useState<OdinConnectedUser | null>(
    null,
  );

  const fetchBalancesAndPositions = useCallback(
    async (user: OdinConnectedUser) => {
      // The Odin API balance and the canister position are independent;
      // fetch them concurrently and handle each outcome on its own.
      const delegationIdentity = user.getIdentity() ?? undefined;
      const actor = createStakingActor(delegationIdentity);
      const [balanceResult, positionResult] = await Promise.allSettled([
        user.getBalance(TOKEN_ID),
        actor.stake_get_position(TOKEN_ID),
      ]);

      if (balanceResult.status === "fulfilled" && balanceResult.value) {
        const tokenBalance = balanceResult.value;
        setToken({
          decimals: tokenBalance.decimals,
          divisibility: tokenBalance.divisibility,
        });
        dispatch({
          type: "SET_BALANCE",
          payload: computeTokenBalance(tokenBalance),
        });
      } else {
        if (balanceResult.status === "rejected") {
          console.error(
            "Failed to fetch token balances:",
            balanceResult.reason,
          );
        } else {
          setToken(null);
        }
        dispatch({ type: "SET_BALANCE", payload: 0 });
      }

      if (positionResult.status === "fulfilled") {
        const position = positionResult.value;
        if (position.length > 0 && position[0]) {
          dispatch({ type: "SYNC_POSITIONS", payload: [position[0]] });
        } else {
          dispatch({ type: "SYNC_POSITIONS", payload: [] });
        }
      } else {
        console.error(
          "Failed to fetch staking position:",
          positionResult.reason,
        );
      }
    },
    [dispatch],
  );

  // Load balances whenever the connected user changes: a fresh connect, a
  // restored session, or a redirect result after reload. `isRestoring` stays
  // true until this first fetch has settled.
  useEffect(() => {
    if (!connectedUser) return;
    let cancelled = false;
    const load = async () => {
      await fetchBalancesAndPositions(connectedUser);
      if (!cancelled) setHydratedUser(connectedUser);
    };
    void load();
    return () => {
      cancelled = true;
    };
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
    setToken(null);
    dispatch({ type: "SET_BALANCE", payload: 0 });
  }, [dispatch]);

  const isHydrating = connectedUser !== null && hydratedUser !== connectedUser;

  const connectionError =
    status === "error" ? connectErrorMessage(request) : null;

  const value = useMemo<WalletContextValue>(
    () => ({
      connectedUser,
      identity: connectedUser?.getIdentity() ?? null,
      principal: connectedUser?.principal || "",
      isConnecting: status === "connecting",
      isRestoring: status === "restoring" || isHydrating,
      token,
      connectionError,
      request,
      connectWallet,
      disconnectWallet,
      refreshBalances,
    }),
    [
      connectedUser,
      status,
      isHydrating,
      token,
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
