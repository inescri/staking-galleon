import { useCallback, useMemo, useState } from "react";
import { useWallet } from "../contexts/useWallet";
import { createGameActor } from "../canister/actor";
import {
  toCandidDifficulty,
  type Difficulty,
  type GameConfig,
  type PoolStats,
  type Result,
  type SettleOutcome,
  type Ship,
} from "../canister/idl";

function unwrapResult<T>(result: Result<T>): T {
  if ("Ok" in result) return result.Ok;
  throw new Error(result.Err);
}

/**
 * Typed access to the game canister. Caller-scoped calls go through the
 * authenticated actor (the Odin delegation); public queries use an anonymous
 * one so they work before connecting.
 */
export function useGameCanister() {
  const { identity } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authenticatedActor = useMemo(
    () => (identity ? createGameActor(identity) : null),
    [identity],
  );

  // Null when `VITE_APP_CANISTER_ID` is unset, so the app still renders.
  const anonymousActor = useMemo(() => {
    try {
      return createGameActor();
    } catch {
      return null;
    }
  }, []);

  const callUpdate = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      if (!authenticatedActor) throw new Error("Wallet not connected");
      setIsLoading(true);
      setError(null);
      try {
        return await fn();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Canister call failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [authenticatedActor],
  );

  const launch = useCallback(
    (difficulty: Difficulty, durationIndex: number): Promise<bigint> =>
      callUpdate(async () =>
        unwrapResult(
          await authenticatedActor!.launch(
            toCandidDifficulty(difficulty),
            durationIndex,
          ),
        ),
      ),
    [callUpdate, authenticatedActor],
  );

  const settle = useCallback(
    (shipId: bigint): Promise<SettleOutcome> =>
      callUpdate(async () =>
        unwrapResult(await authenticatedActor!.settle(shipId)),
      ),
    [callUpdate, authenticatedActor],
  );

  const claim = useCallback(
    (shipId: bigint): Promise<bigint> =>
      callUpdate(async () =>
        unwrapResult(await authenticatedActor!.claim(shipId)),
      ),
    [callUpdate, authenticatedActor],
  );

  /** Pull pre-approved tokens into the house pool; returns the new `available`. */
  const fundPool = useCallback(
    (amount: bigint): Promise<bigint> =>
      callUpdate(async () =>
        unwrapResult(await authenticatedActor!.fund_pool(amount)),
      ),
    [callUpdate, authenticatedActor],
  );

  /** The caller's ships — keyed by caller, so it needs the delegation. */
  const getMyShips = useCallback((): Promise<Ship[]> => {
    if (!authenticatedActor) throw new Error("Wallet not connected");
    return authenticatedActor.get_my_ships();
  }, [authenticatedActor]);

  const getConfig = useCallback((): Promise<GameConfig> => {
    if (!anonymousActor) throw new Error("Game canister not configured");
    return anonymousActor.get_config();
  }, [anonymousActor]);

  const getPoolStats = useCallback((): Promise<PoolStats> => {
    if (!anonymousActor) throw new Error("Game canister not configured");
    return anonymousActor.get_pool_stats();
  }, [anonymousActor]);

  return {
    launch,
    settle,
    claim,
    fundPool,
    getMyShips,
    getConfig,
    getPoolStats,
    isLoading,
    error,
  };
}
