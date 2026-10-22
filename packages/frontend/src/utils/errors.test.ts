import { describe, expect, it } from "vitest";

import { launchErrorText, returnErrorText } from "./errors";

describe("launchErrorText", () => {
  it.each([
    ["POOL_INSUFFICIENT: need 5", "error.poolInsufficient"],
    ["FLEET_FULL", "error.fleetFull"],
    ["PAUSED", "error.paused"],
    ["PULL_FAILED: InsufficientAllowance", "error.pullFailed"],
  ])("%s → %s", (message, key) => {
    expect(launchErrorText(new Error(message))).toEqual({ key });
  });

  it("passes an unknown Error message through raw", () => {
    expect(launchErrorText(new Error("boom"))).toEqual({ raw: "boom" });
  });

  it("falls back for a non-Error", () => {
    expect(launchErrorText("nope")).toEqual({ key: "error.launchFailed" });
  });
});

describe("returnErrorText", () => {
  it.each([
    ["SHIP_STILL_AT_SEA", "error.shipStillAtSea"],
    ["BAD_STATUS:settling", "error.stillRolling"],
    ["PAYOUT_FAILED: fee", "error.payoutFailed"],
  ])("%s → %s", (message, key) => {
    expect(returnErrorText(new Error(message))).toEqual({ key });
  });

  it("passes other statuses through raw", () => {
    expect(returnErrorText(new Error("BAD_STATUS:paid"))).toEqual({
      raw: "BAD_STATUS:paid",
    });
  });

  it("falls back for a non-Error", () => {
    expect(returnErrorText(undefined)).toEqual({ key: "error.returnFailed" });
  });
});
