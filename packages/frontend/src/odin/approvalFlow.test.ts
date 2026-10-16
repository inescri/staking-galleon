import { describe, expect, it } from "vitest";
import type { OdinRequestState } from "odin-connect";

import {
  approvalFor,
  claimRequest,
  parseApprovalReturnState,
} from "./approvalFlow";

const stake = {
  flow: "stake",
  tier: "coastal",
  durationMs: 30_000,
  stakeAmount: 100,
} as const;

function approve(id: string, returnState: unknown): OdinRequestState {
  return {
    id,
    action: "icrc_approve",
    status: "success",
    input: { token: "2j5i", spender: "aaaaa-aa", amount: 200_000n },
    returnState,
  };
}

describe("parseApprovalReturnState", () => {
  it("accepts the stake shape", () => {
    expect(parseApprovalReturnState(stake)).toEqual(stake);
  });

  it("rejects anything else", () => {
    expect(parseApprovalReturnState(undefined)).toBeNull();
    expect(parseApprovalReturnState({ ...stake, tier: "atlantis" })).toBeNull();
    expect(parseApprovalReturnState({ ...stake, durationMs: "30" })).toBeNull();
    expect(parseApprovalReturnState({ flow: "other" })).toBeNull();
  });
});

describe("approvalFor", () => {
  it("matches the stake flow's approval", () => {
    const request = approve("r1", stake);
    expect(approvalFor(request, "stake")?.request).toBe(request);
    expect(approvalFor(request, "stake")?.returnState).toEqual(stake);
  });

  it("ignores other actions and untagged approvals", () => {
    const connect: OdinRequestState = {
      id: "c1",
      action: "connect",
      status: "success",
      input: { requires_api: false, requires_delegation: true, targets: [] },
    };
    expect(approvalFor(connect, "stake")).toBeNull();
    expect(approvalFor(approve("r2", undefined), "stake")).toBeNull();
    expect(approvalFor(null, "stake")).toBeNull();
  });
});

describe("claimRequest", () => {
  it("claims each request id once", () => {
    expect(claimRequest("once")).toBe(true);
    expect(claimRequest("once")).toBe(false);
    expect(claimRequest("other")).toBe(true);
  });
});
