import type { OdinRequestState } from "odin-connect";
import type { Tier } from "../utils/rewards";

/**
 * `returnState` the stake flow attaches to its ICRC-2 approval. The approved
 * amount is in `request.input`, but the tier, duration and display amount are
 * form state — gone after a redirect reload — so they ride along here.
 * `returnState` survives the redirect (bigints included).
 */
export interface ApprovalReturnState {
  flow: "stake";
  tier: Tier;
  durationMs: number;
  stakeAmount: number;
}

const TIERS: readonly Tier[] = [
  "coastal",
  "open_sea",
  "deep_ocean",
  "kraken_waters",
];

type IcrcApproveRequest = Extract<OdinRequestState, { action: "icrc_approve" }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Narrow an untyped `request.returnState` to this app's shape. */
export function parseApprovalReturnState(
  value: unknown,
): ApprovalReturnState | null {
  if (!isRecord(value)) {
    return null;
  }
  if (
    value.flow === "stake" &&
    typeof value.tier === "string" &&
    (TIERS as readonly string[]).includes(value.tier) &&
    typeof value.durationMs === "number" &&
    typeof value.stakeAmount === "number"
  ) {
    return {
      flow: "stake",
      tier: value.tier as Tier,
      durationMs: value.durationMs,
      stakeAmount: value.stakeAmount,
    };
  }
  return null;
}

/**
 * The latest request when it is this flow's ICRC-2 approval, else null.
 * Only the latest request is in state; an older one is never returned.
 */
export function approvalFor(
  request: OdinRequestState | null,
  flow: ApprovalReturnState["flow"],
): { request: IcrcApproveRequest; returnState: ApprovalReturnState } | null {
  if (request?.action !== "icrc_approve") {
    return null;
  }
  const returnState = parseApprovalReturnState(request.returnState);
  if (returnState?.flow !== flow) {
    return null;
  }
  return { request, returnState };
}

/**
 * Request ids whose outcome has already been acted on during this page load.
 *
 * The follow-up to an approval is a canister update call that moves funds
 * (`stake_deposit_and_lock`), so it must run at most once per approval. A
 * settled request stays in the SDK state after it has been handled, and
 * effects re-run (re-render, StrictMode, a remounted form), so the id is
 * claimed synchronously *before* the call, in module scope so it outlives
 * any one component instance. After a reload the SDK no longer reports the
 * old request (`request` is null), so nothing needs persisting.
 */
const handledRequests = new Set<string>();

/** Claim a request id; false when it was already claimed. */
export function claimRequest(id: string): boolean {
  if (handledRequests.has(id)) {
    return false;
  }
  handledRequests.add(id);
  return true;
}
