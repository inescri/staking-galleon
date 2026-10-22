import type { OdinRequestState } from "odin-connect";
import type { UiText } from "../i18n/translate";

/**
 * Auth lifecycle, derived from the odin-connect state store:
 *   restoring     — the SDK is restoring the stored session / reading a
 *                   returning redirect result (`state.status: "initializing"`)
 *   disconnected  — no session; awaiting a connect()
 *   connecting    — a connect is pending: the Odin popup is open, or the tab
 *                   is on its way to Odin (redirect mode)
 *   connected     — authenticated
 *   error         — the last connect was rejected, failed or could not be
 *                   verified. Never retried automatically.
 */
export type OdinAuthStatus =
  "restoring" | "disconnected" | "connecting" | "connected" | "error";

/** The parts of the SDK state the auth status is derived from. */
interface AuthStateInput {
  status: "initializing" | "ready";
  /** Only whether a user is connected matters here. */
  user: unknown;
  request: Pick<OdinRequestState, "action" | "status"> | null;
}

/**
 * Map the SDK's `{ status, user, request }` onto the app's auth states.
 * Pure, so it is unit-tested without the SDK or a browser.
 *
 * A connected user wins over the latest connect's outcome: a rejected or
 * unverified *re*-connect keeps the previously stored session.
 */
export function deriveAuthStatus(state: AuthStateInput): OdinAuthStatus {
  if (state.status === "initializing") {
    return "restoring";
  }
  if (state.user !== null) {
    return "connected";
  }
  const { request } = state;
  if (request?.action === "connect") {
    if (request.status === "pending") {
      return "connecting";
    }
    if (
      request.status === "rejected" ||
      request.status === "failed" ||
      request.status === "unverified"
    ) {
      return "error";
    }
  }
  return "disconnected";
}

/**
 * User-facing message for a connect that did not succeed, else null. An SDK
 * error on `failed` is passed through untranslated.
 */
export function connectErrorText(
  request: Pick<OdinRequestState, "action" | "status" | "error"> | null,
): UiText | null {
  if (request?.action !== "connect") {
    return null;
  }
  switch (request.status) {
    case "rejected":
      if (request.error === "untrusted_origin") {
        return { key: "wallet.error.untrustedOrigin" };
      }
      if (request.error === "popup_closed") {
        return { key: "wallet.error.popupClosed" };
      }
      return { key: "wallet.error.cancelled" };
    case "unverified":
      return { key: "wallet.error.unverified" };
    case "failed":
      return request.error
        ? { raw: request.error }
        : { key: "wallet.error.failed" };
    default:
      return null;
  }
}
