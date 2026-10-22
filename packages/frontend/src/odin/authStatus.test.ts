import { describe, expect, it } from "vitest";

import { connectErrorText, deriveAuthStatus } from "./authStatus";

const connectRequest = (
  status: "pending" | "success" | "rejected" | "failed" | "unverified",
) => ({ action: "connect", status }) as const;

describe("deriveAuthStatus", () => {
  it("is restoring while the SDK initializes", () => {
    expect(
      deriveAuthStatus({ status: "initializing", user: null, request: null }),
    ).toBe("restoring");
  });

  it("is disconnected when ready without a user or request", () => {
    expect(
      deriveAuthStatus({ status: "ready", user: null, request: null }),
    ).toBe("disconnected");
  });

  it("is connecting while a connect is pending", () => {
    expect(
      deriveAuthStatus({
        status: "ready",
        user: null,
        request: connectRequest("pending"),
      }),
    ).toBe("connecting");
  });

  it.each(["rejected", "failed", "unverified"] as const)(
    "is error after a %s connect",
    (status) => {
      expect(
        deriveAuthStatus({
          status: "ready",
          user: null,
          request: connectRequest(status),
        }),
      ).toBe("error");
    },
  );

  it("stays connected when a re-connect is rejected (the stored session is kept)", () => {
    expect(
      deriveAuthStatus({
        status: "ready",
        user: {},
        request: connectRequest("rejected"),
      }),
    ).toBe("connected");
  });

  it("ignores action requests when deciding the auth status", () => {
    const approve = { action: "icrc_approve", status: "rejected" } as const;
    expect(
      deriveAuthStatus({ status: "ready", user: null, request: approve }),
    ).toBe("disconnected");
    expect(
      deriveAuthStatus({ status: "ready", user: {}, request: approve }),
    ).toBe("connected");
  });
});

describe("connectErrorText", () => {
  const connect = (
    status: "pending" | "success" | "rejected" | "failed" | "unverified",
    error?: string,
  ) => ({ action: "connect", status, error }) as const;

  it.each([
    [connect("rejected", "untrusted_origin"), "wallet.error.untrustedOrigin"],
    [connect("rejected", "popup_closed"), "wallet.error.popupClosed"],
    [connect("rejected"), "wallet.error.cancelled"],
    [connect("unverified"), "wallet.error.unverified"],
    [connect("failed"), "wallet.error.failed"],
  ])("%o → %s", (request, key) => {
    expect(connectErrorText(request)).toEqual({ key });
  });

  it("passes a failed connect's SDK error through raw", () => {
    expect(connectErrorText(connect("failed", "network down"))).toEqual({
      raw: "network down",
    });
  });

  it("is null for pending, success, non-connect and no request", () => {
    expect(connectErrorText(connect("pending"))).toBeNull();
    expect(connectErrorText(connect("success"))).toBeNull();
    expect(
      connectErrorText({ action: "icrc_approve", status: "rejected" }),
    ).toBeNull();
    expect(connectErrorText(null)).toBeNull();
  });
});
