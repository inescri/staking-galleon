import type { MessageKey, UiText } from "../i18n/translate";

/** First code the canister error message starts with, mapped to its key. */
function matchCode(
  message: string,
  codes: readonly (readonly [string, MessageKey])[],
): MessageKey | null {
  for (const [code, key] of codes) {
    if (message.startsWith(code)) return key;
  }
  return null;
}

const LAUNCH_CODES = [
  ["POOL_INSUFFICIENT", "error.poolInsufficient"],
  ["FLEET_FULL", "error.fleetFull"],
  ["PAUSED", "error.paused"],
  ["PULL_FAILED", "error.pullFailed"],
] as const;

const RETURN_CODES = [
  ["SHIP_STILL_AT_SEA", "error.shipStillAtSea"],
  ["BAD_STATUS:settling", "error.stillRolling"],
  ["PAYOUT_FAILED", "error.payoutFailed"],
] as const;

function describeError(
  err: unknown,
  codes: readonly (readonly [string, MessageKey])[],
  fallback: MessageKey,
): UiText {
  if (!(err instanceof Error)) return { key: fallback };
  const key = matchCode(err.message, codes);
  return key === null ? { raw: err.message } : { key };
}

/** Map the canister's stable launch error codes to player-facing text. */
export function launchErrorText(err: unknown): UiText {
  return describeError(err, LAUNCH_CODES, "error.launchFailed");
}

/** Map the canister's stable settle/claim error codes to player-facing text. */
export function returnErrorText(err: unknown): UiText {
  return describeError(err, RETURN_CODES, "error.returnFailed");
}
