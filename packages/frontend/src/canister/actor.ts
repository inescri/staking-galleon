import { Actor, HttpAgent, type Identity } from "@dfinity/agent";
import { idlFactory, type GameCanister } from "./idl";
import { APP_CANISTER_ID, IC_HOST, IS_LOCAL } from "./config";

/**
 * Typed actor for the game canister. Pass the Odin Connect delegation
 * identity for caller-scoped calls (`launch`, `settle`, `get_my_ships`);
 * omit it for public queries (`get_config`, `get_pool_stats`).
 *
 * On a local replica the agent fetches the (insecure) root key before its
 * first call; never against mainnet.
 */
export function createGameActor(identity?: Identity): GameCanister {
  if (APP_CANISTER_ID === "") {
    throw new Error(
      "VITE_APP_CANISTER_ID is not set — cannot reach the game canister",
    );
  }
  const agent = HttpAgent.createSync({
    identity,
    host: IC_HOST,
    shouldFetchRootKey: IS_LOCAL,
  });
  return Actor.createActor<GameCanister>(idlFactory, {
    agent,
    canisterId: APP_CANISTER_ID,
  });
}
