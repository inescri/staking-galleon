import { useCallback, useMemo, useState } from "react";
import { useWallet } from "../contexts/useWallet";
import { createStakingActor } from "../canister/actor";
import type {
  Result,
  StakingPosition,
  UserReward,
  RewardPool,
  LockConstraints,
  NextDistribution,
} from "../canister/staking.did";

function unwrapResult(result: Result): bigint {
  if ("Ok" in result) return result.Ok;
  throw new Error((result as { Err: string }).Err);
}

export function useStakingCanister() {
  const { identity } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authenticatedActor = useMemo(
    () => (identity ? createStakingActor(identity) : null),
    [identity],
  );

  const anonymousActor = useMemo(() => createStakingActor(), []);

  const callUpdate = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      if (!authenticatedActor) throw new Error("Wallet not connected");
      setIsLoading(true);
      setError(null);
      try {
        const result = await fn();
        return result;
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

  // --- Update calls ---

  const depositAndLock = useCallback(
    (tokenId: string, amount: bigint, durationMs: bigint) =>
      callUpdate(async () => {
        const result = await authenticatedActor!.stake_deposit_and_lock(
          tokenId,
          amount,
          durationMs,
        );
        return unwrapResult(result);
      }),
    [callUpdate, authenticatedActor],
  );

  const deposit = useCallback(
    (tokenId: string, amount: bigint) =>
      callUpdate(async () => {
        const result = await authenticatedActor!.stake_deposit(tokenId, amount);
        return unwrapResult(result);
      }),
    [callUpdate, authenticatedActor],
  );

  const lockTokens = useCallback(
    (tokenId: string, amount: bigint, durationMs: bigint) =>
      callUpdate(async () => {
        const result = await authenticatedActor!.stake_lock_tokens(
          tokenId,
          amount,
          durationMs,
        );
        return unwrapResult(result);
      }),
    [callUpdate, authenticatedActor],
  );

  const unlock = useCallback(
    (tokenId: string) =>
      callUpdate(async () => {
        const result = await authenticatedActor!.stake_unlock(tokenId);
        return unwrapResult(result);
      }),
    [callUpdate, authenticatedActor],
  );

  const unlockAndWithdraw = useCallback(
    (tokenId: string) =>
      callUpdate(async () => {
        const result =
          await authenticatedActor!.stake_unlock_and_withdraw(tokenId);
        return unwrapResult(result);
      }),
    [callUpdate, authenticatedActor],
  );

  const withdraw = useCallback(
    (tokenId: string, amount: bigint) =>
      callUpdate(async () => {
        const result = await authenticatedActor!.stake_withdraw(
          tokenId,
          amount,
        );
        return unwrapResult(result);
      }),
    [callUpdate, authenticatedActor],
  );

  const claimRewards = useCallback(
    (tokenId: string) =>
      callUpdate(async () => {
        const result = await authenticatedActor!.stake_claim_rewards(tokenId);
        return unwrapResult(result);
      }),
    [callUpdate, authenticatedActor],
  );

  const increasePosition = useCallback(
    (tokenId: string, amount: bigint) =>
      callUpdate(async () => {
        const result = await authenticatedActor!.stake_increase_position(
          tokenId,
          amount,
        );
        return unwrapResult(result);
      }),
    [callUpdate, authenticatedActor],
  );

  const increaseDuration = useCallback(
    (tokenId: string, durationMs: bigint) =>
      callUpdate(async () => {
        const result = await authenticatedActor!.stake_increase_duration(
          tokenId,
          durationMs,
        );
        return unwrapResult(result);
      }),
    [callUpdate, authenticatedActor],
  );

  // --- Query calls ---

  const getPosition = useCallback(
    async (tokenId: string): Promise<StakingPosition | null> => {
      const result = await anonymousActor.stake_get_position(tokenId);
      return result.length > 0 ? (result[0] ?? null) : null;
    },
    [anonymousActor],
  );

  const getUserRewards = useCallback(
    async (tokenId?: string): Promise<UserReward[]> => {
      return anonymousActor.stake_get_user_rewards(tokenId ? [tokenId] : []);
    },
    [anonymousActor],
  );

  const getRewardPools = useCallback(
    async (tokenId: string): Promise<RewardPool[]> => {
      return anonymousActor.stake_get_reward_pools_for_token(tokenId);
    },
    [anonymousActor],
  );

  const getLockConstraints = useCallback(async (): Promise<LockConstraints> => {
    return anonymousActor.stake_get_lock_constraints();
  }, [anonymousActor]);

  const getNextDistribution =
    useCallback(async (): Promise<NextDistribution> => {
      return anonymousActor.stake_get_next_distribution();
    }, [anonymousActor]);

  const getEstimatedDailyRewards = useCallback(
    async (tokenId: string): Promise<bigint> => {
      return anonymousActor.stake_get_estimated_daily_rewards(tokenId);
    },
    [anonymousActor],
  );

  const getAvailableBalance = useCallback(
    async (tokenId: string): Promise<bigint> => {
      return anonymousActor.stake_get_available_balance(tokenId);
    },
    [anonymousActor],
  );

  const getStakersForToken = useCallback(
    async (tokenId: string): Promise<string[]> => {
      return anonymousActor.stake_get_stakers_for_token(tokenId);
    },
    [anonymousActor],
  );

  const getVersion = useCallback(async (): Promise<string> => {
    return anonymousActor.stake_get_version();
  }, [anonymousActor]);

  return {
    // Update calls
    deposit,
    depositAndLock,
    lockTokens,
    unlock,
    unlockAndWithdraw,
    withdraw,
    claimRewards,
    increasePosition,
    increaseDuration,

    // Query calls
    getPosition,
    getUserRewards,
    getRewardPools,
    getLockConstraints,
    getNextDistribution,
    getEstimatedDailyRewards,
    getAvailableBalance,
    getStakersForToken,
    getVersion,

    // State
    isLoading,
    error,
  };
}
