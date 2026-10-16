import { describe, expect, it } from "vitest";
import type { OdinRequestState } from "odin-connect";

import {
  approvalFor,
  claimRequest,
  parseApprovalReturnState,
} from "./approvalFlow";

const stake = { flow: "stake", tier: "coastal", durationIndex: 1 } as const;
const settle = { flow: "settle", shipId: "42" } as const;

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
  it("accepts the stake and settle shapes", () => {
    expect(parseApprovalReturnState(stake)).toEqual(stake);
    expect(parseApprovalReturnState(settle)).toEqual(settle);
  });

  it("rejects anything else", () => {
    expect(parseApprovalReturnState(undefined)).toBeNull();
    expect(parseApprovalReturnState({ ...stake, tier: "atlantis" })).toBeNull();
    expect(
      parseApprovalReturnState({ ...stake, durationIndex: "1" }),
    ).toBeNull();
    expect(
      parseApprovalReturnState({ ...stake, durationIndex: -1 }),
    ).toBeNull();
    expect(
      parseApprovalReturnState({ ...stake, durationIndex: 1.5 }),
    ).toBeNull();
    expect(parseApprovalReturnState({ ...settle, shipId: 42 })).toBeNull();
    expect(parseApprovalReturnState({ ...settle, shipId: "abc" })).toBeNull();
    expect(parseApprovalReturnState({ flow: "other" })).toBeNull();
  });

  it("ignores the pre-canister stake shape", () => {
    expect(
      parseApprovalReturnState({
        flow: "stake",
        tier: "coastal",
        durationMs: 30_000,
        stakeAmount: 100,
      }),
    ).toBeNull();
  });
});

describe("approvalFor", () => {
  it("matches the requested flow's approval", () => {
    const request = approve("r1", stake);
    expect(approvalFor(request, "stake")?.request).toBe(request);
    expect(approvalFor(request, "stake")?.returnState).toEqual(stake);
    expect(approvalFor(request, "settle")).toBeNull();
    expect(approvalFor(approve("r2", settle), "settle")?.returnState).toEqual(
      settle,
    );
  });

  it("ignores other actions and untagged approvals", () => {
    const connect: OdinRequestState = {
      id: "c1",
      action: "connect",
      status: "success",
      input: { requires_api: false, requires_delegation: true, targets: [] },
    };
    expect(approvalFor(connect, "stake")).toBeNull();
    expect(approvalFor(approve("r3", undefined), "stake")).toBeNull();
    expect(approvalFor(null, "stake")).toBeNull();
  });
});

describe("claimRequest", () => {
  it("claims an id once", () => {
    expect(claimRequest("x1")).toBe(true);
    expect(claimRequest("x1")).toBe(false);
    expect(claimRequest("x2")).toBe(true);
  });
});
