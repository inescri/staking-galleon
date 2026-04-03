import { Actor, HttpAgent, type Identity } from "@dfinity/agent";
import { idlFactory, type StakingService } from "./staking.did";

export const TOKEN_ID = "2j5i";
export const STAKING_CANISTER_ID = "sfgyi-iyaaa-aaaam-qepyq-cai";
const IC_HOST = "https://icp0.io";

export function createStakingActor(identity?: Identity): StakingService {
  const agent = HttpAgent.createSync({ identity, host: IC_HOST });
  return Actor.createActor<StakingService>(idlFactory, {
    agent,
    canisterId: STAKING_CANISTER_ID,
  });
}
