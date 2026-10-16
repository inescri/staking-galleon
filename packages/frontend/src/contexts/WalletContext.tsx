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
import { createGameActor } from "../canister/actor";
import { APP_CANISTER_ID, TOKEN_ID } from "../canister/config";
import { odin } from "../odin/client";
import { useOdinState } from "../odin/useOdinState";
import { connectErrorMessage, deriveAuthStatus } from "../odin/authStatus";
import { parseGameConfig } from "../utils/game";

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
  // The user whose balance and ships have been fetched at least once.
  const [hydratedUser, setHydratedUser] = useState<OdinConnectedUser | null>(
    null,
  );

  // The game rules are public: load them once so the form can render stakes
  // and durations before (and without) a wallet.
  useEffect(() => {
    if (APP_CANISTER_ID === "") return;
    let cancelled = false;
    const load = async () => {
      try {
        const config = await createGameActor().get_config();
        if (!cancelled) {
          dispatch({ type: "SET_RULES", payload: parseGameConfig(config) });
        }
      } catch (err) {
        console.error("Failed to fetch game config:", err);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  const fetchBalancesAndShips = useCallback(
    async (user: OdinConnectedUser) => {
      // The Odin API balance, the caller's ships and the rules are
      // independent; fetch them concurrently and handle each on its own.
      const actor = createGameActor(user.getIdentity() ?? undefined);
      const [balanceResult, shipsResult, configResult] =
        await Promise.allSettled([
          user.getBalance(TOKEN_ID),
          actor.get_my_ships(),
          actor.get_config(),
        ]);

      if (balanceResult.status === "fulfilled" && balanceResult.value) {
        const tokenBalance = balanceResult.value;
        setToken({
          decimals: tokenBalance.decimals,
          divisibility: tokenBalance.divisibility,
        });
        dispatch({
          type: "SET_BALANCE",
          payload: {
            balance: computeTokenBalance(tokenBalance),
            balanceUnits: tokenBalance.balance,
          },
        });
      } else {
        if (balanceResult.status === "rejected") {
          console.error("Failed to fetch token balance:", balanceResult.reason);
        } else {
          setToken(null);
        }
        dispatch({
          type: "SET_BALANCE",
          payload: { balance: 0, balanceUnits: 0n },
        });
      }

      if (shipsResult.status === "fulfilled") {
        dispatch({ type: "SYNC_SHIPS", payload: shipsResult.value });
      } else {
        console.error("Failed to fetch ships:", shipsResult.reason);
      }

      if (configResult.status === "fulfilled") {
        dispatch({
          type: "SET_RULES",
          payload: parseGameConfig(configResult.value),
        });
      } else {
        console.error("Failed to fetch game config:", configResult.reason);
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
      try {
        await fetchBalancesAndShips(connectedUser);
      } catch (err) {
        console.error("Failed to load wallet state:", err);
      }
      if (!cancelled) setHydratedUser(connectedUser);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [connectedUser, fetchBalancesAndShips]);

  const connectWallet = useCallback(() => {
    // Fire and forget: the outcome lands in `state` (popup or redirect). The
    // SDK never surfaces an unhandled rejection for an ignored promise.
    void odin.connect({
      requires_api: false,
      requires_delegation: true,
      targets: APP_CANISTER_ID === "" ? [] : [APP_CANISTER_ID],
    });
  }, []);

  const refreshBalances = useCallback(async () => {
    if (connectedUser) {
      await fetchBalancesAndShips(connectedUser);
    }
  }, [connectedUser, fetchBalancesAndShips]);

  const disconnectWallet = useCallback(() => {
    odin.disconnect();
    setToken(null);
    dispatch({
      type: "SET_BALANCE",
      payload: { balance: 0, balanceUnits: 0n },
    });
    dispatch({ type: "SYNC_SHIPS", payload: [] });
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
