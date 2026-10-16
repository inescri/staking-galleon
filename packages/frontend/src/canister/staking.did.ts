// --- Candid IDL Factory ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const idlFactory = ({ IDL }: any) => {
  const Result = IDL.Variant({ Ok: IDL.Nat, Err: IDL.Text });

  const StakingPosition = IDL.Record({
    tokenId: IDL.Text,
    lockEnd: IDL.Nat,
    remainingDuration: IDL.Nat,
    user: IDL.Text,
    lockStart: IDL.Nat,
    initialDuration: IDL.Nat,
    stakedAmount: IDL.Nat,
  });

  const UserReward = IDL.Record({
    totalEarnedAmount: IDL.Nat,
    tokenId: IDL.Text,
    estimatedDailyRate: IDL.Nat,
    unclaimedAmount: IDL.Nat,
  });

  const RewardPool = IDL.Record({
    remaining_days: IDL.Nat,
    status: IDL.Text,
    provider: IDL.Text,
    reward_token: IDL.Text,
    apr_basis_points: IDL.Nat,
    qualified_staker_count: IDL.Nat,
    reward_duration_days: IDL.Nat,
    total_reward_amount: IDL.Nat,
    total_qualified_stake: IDL.Nat,
    target_token: IDL.Text,
    start_timestamp_ms: IDL.Nat,
    end_timestamp_ms: IDL.Nat,
    total_distributed_amount: IDL.Nat,
    pool_id: IDL.Nat,
    daily_distribution_amount: IDL.Nat,
    estimated_daily_per_staker: IDL.Nat,
    minimum_lock_days: IDL.Nat,
  });

  const LockConstraints = IDL.Record({
    maxLockDurationMs: IDL.Nat,
    minLockDurationMs: IDL.Nat,
  });

  const NextDistribution = IDL.Record({
    now: IDL.Nat,
    deltaSeconds: IDL.Int,
    isDistributionInProgress: IDL.Bool,
    nextDistributionAt: IDL.Nat,
  });

  return IDL.Service({
    // Update calls
    stake_deposit: IDL.Func([IDL.Text, IDL.Nat], [Result], []),
    stake_deposit_and_lock: IDL.Func(
      [IDL.Text, IDL.Nat, IDL.Nat],
      [Result],
      [],
    ),
    stake_lock_tokens: IDL.Func([IDL.Text, IDL.Nat, IDL.Nat], [Result], []),
    stake_unlock: IDL.Func([IDL.Text], [Result], []),
    stake_unlock_and_withdraw: IDL.Func([IDL.Text], [Result], []),
    stake_withdraw: IDL.Func([IDL.Text, IDL.Nat], [Result], []),
    stake_claim_rewards: IDL.Func([IDL.Text], [Result], []),
    stake_increase_position: IDL.Func([IDL.Text, IDL.Nat], [Result], []),
    stake_increase_duration: IDL.Func([IDL.Text, IDL.Nat], [Result], []),

    // Query calls
    stake_get_position: IDL.Func(
      [IDL.Text],
      [IDL.Opt(StakingPosition)],
      ["query"],
    ),
    stake_get_user_rewards: IDL.Func(
      [IDL.Opt(IDL.Text)],
      [IDL.Vec(UserReward)],
      ["query"],
    ),
    stake_get_reward_pools_for_token: IDL.Func(
      [IDL.Text],
      [IDL.Vec(RewardPool)],
      ["query"],
    ),
    stake_get_lock_constraints: IDL.Func([], [LockConstraints], ["query"]),
    stake_get_next_distribution: IDL.Func([], [NextDistribution], ["query"]),
    stake_get_estimated_daily_rewards: IDL.Func(
      [IDL.Text],
      [IDL.Nat],
      ["query"],
    ),
    stake_get_available_balance: IDL.Func([IDL.Text], [IDL.Nat], ["query"]),
    stake_get_stakers_for_token: IDL.Func(
      [IDL.Text],
      [IDL.Vec(IDL.Text)],
      ["query"],
    ),
    stake_get_version: IDL.Func([], [IDL.Text], ["query"]),
  });
};

// --- TypeScript Types ---

export type Result = { Ok: bigint } | { Err: string };

export interface StakingPosition {
  tokenId: string;
  lockEnd: bigint;
  remainingDuration: bigint;
  user: string;
  lockStart: bigint;
  initialDuration: bigint;
  stakedAmount: bigint;
}

export interface UserReward {
  totalEarnedAmount: bigint;
  tokenId: string;
  estimatedDailyRate: bigint;
  unclaimedAmount: bigint;
}

export interface RewardPool {
  remaining_days: bigint;
  status: string;
  provider: string;
  reward_token: string;
  apr_basis_points: bigint;
  qualified_staker_count: bigint;
  reward_duration_days: bigint;
  total_reward_amount: bigint;
  total_qualified_stake: bigint;
  target_token: string;
  start_timestamp_ms: bigint;
  end_timestamp_ms: bigint;
  total_distributed_amount: bigint;
  pool_id: bigint;
  daily_distribution_amount: bigint;
  estimated_daily_per_staker: bigint;
  minimum_lock_days: bigint;
}

export interface LockConstraints {
  maxLockDurationMs: bigint;
  minLockDurationMs: bigint;
}

export interface NextDistribution {
  now: bigint;
  deltaSeconds: bigint;
  isDistributionInProgress: boolean;
  nextDistributionAt: bigint;
}

export interface StakingService {
  // Update calls
  stake_deposit(tokenId: string, amount: bigint): Promise<Result>;
  stake_deposit_and_lock(
    tokenId: string,
    amount: bigint,
    durationMs: bigint,
  ): Promise<Result>;
  stake_lock_tokens(
    tokenId: string,
    amount: bigint,
    durationMs: bigint,
  ): Promise<Result>;
  stake_unlock(tokenId: string): Promise<Result>;
  stake_unlock_and_withdraw(tokenId: string): Promise<Result>;
  stake_withdraw(tokenId: string, amount: bigint): Promise<Result>;
  stake_claim_rewards(tokenId: string): Promise<Result>;
  stake_increase_position(tokenId: string, amount: bigint): Promise<Result>;
  stake_increase_duration(tokenId: string, durationMs: bigint): Promise<Result>;

  // Query calls
  stake_get_position(tokenId: string): Promise<[StakingPosition] | []>;
  stake_get_user_rewards(tokenId: [string] | []): Promise<UserReward[]>;
  stake_get_reward_pools_for_token(tokenId: string): Promise<RewardPool[]>;
  stake_get_lock_constraints(): Promise<LockConstraints>;
  stake_get_next_distribution(): Promise<NextDistribution>;
  stake_get_estimated_daily_rewards(tokenId: string): Promise<bigint>;
  stake_get_available_balance(tokenId: string): Promise<bigint>;
  stake_get_stakers_for_token(tokenId: string): Promise<string[]>;
  stake_get_version(): Promise<string>;
}
