import { Actor, HttpAgent, type Identity } from "@dfinity/agent";
import { idlFactory, type StakingService } from "./staking.did";
import { IC_HOST, STAKING_CANISTER_ID } from "./config";

export function createStakingActor(identity?: Identity): StakingService {
  const agent = HttpAgent.createSync({ identity, host: IC_HOST });
  return Actor.createActor<StakingService>(idlFactory, {
    agent,
    canisterId: STAKING_CANISTER_ID,
  });
}
