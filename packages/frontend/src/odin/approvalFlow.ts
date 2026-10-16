import type { OdinRequestState } from "odin-connect";
import { DIFFICULTIES, type Difficulty } from "../canister/idl";

/**
 * `returnState` the game attaches to its ICRC-2 approvals so the follow-up
 * canister call can be made after the approval settles — including after a
 * redirect reload, where form state is gone. `returnState` survives the
 * redirect.
 *
 *   stake  — approve the game token for a difficulty's fixed stake, then
 *            `launch(difficulty, durationIndex)`. The canister dictates the
 *            amount, so only the choice rides along.
 *   settle — approve BTC for the payout fee, then `settle(shipId)` (or
 *            `claim(shipId)` for a ship whose payout is pending).
 */
export type ApprovalReturnState =
  | { flow: "stake"; tier: Difficulty; durationIndex: number }
  | { flow: "settle"; shipId: string };

export type ApprovalFlow = ApprovalReturnState["flow"];

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
    (DIFFICULTIES as readonly string[]).includes(value.tier) &&
    typeof value.durationIndex === "number" &&
    Number.isInteger(value.durationIndex) &&
    value.durationIndex >= 0
  ) {
    return {
      flow: "stake",
      tier: value.tier as Difficulty,
      durationIndex: value.durationIndex,
    };
  }
  if (
    value.flow === "settle" &&
    typeof value.shipId === "string" &&
    /^[0-9]+$/.test(value.shipId)
  ) {
    return { flow: "settle", shipId: value.shipId };
  }
  return null;
}

/**
 * The latest request when it is the given flow's ICRC-2 approval, else null.
 * Only the latest request is in state; an older one is never returned.
 */
export function approvalFor<F extends ApprovalFlow>(
  request: OdinRequestState | null,
  flow: F,
): {
  request: IcrcApproveRequest;
  returnState: Extract<ApprovalReturnState, { flow: F }>;
} | null {
  if (request?.action !== "icrc_approve") {
    return null;
  }
  const returnState = parseApprovalReturnState(request.returnState);
  if (returnState?.flow !== flow) {
    return null;
  }
  return {
    request,
    returnState: returnState as Extract<ApprovalReturnState, { flow: F }>,
  };
}

/**
 * Request ids whose outcome has already been acted on during this page load.
 *
 * The follow-up to an approval is a canister update call that moves funds
 * (`launch`, `settle`), so it must run at most once per approval. A settled
 * request stays in the SDK state after it has been handled, and effects
 * re-run (re-render, StrictMode, a remounted component), so the id is
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
