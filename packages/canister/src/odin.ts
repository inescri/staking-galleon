import { call, IDL } from "azle";
import { Principal } from "@dfinity/principal";

/**
 * Client for the Odin multiplexed ICRC ledger. Odin holds every token balance
 * in ONE ledger canister, addressed by (owner, subaccount) where the subaccount
 * is `odin_token_pointer(tokenId)` — the token identity is encoded in the
 * subaccount, not in a separate per-token ledger principal.
 *
 * The ledger principal differs per Odin environment, so every function takes
 * it as its first argument; the canister reads it from its init args:
 *   - prod / staging: `yspgd-ciaaa-aaaaj-a6rrq-cai`
 *   - dev:            `w5cxm-6iaaa-aaaaj-az4jq-cai`
 */

/** Odin's BTC token id — the asset the flat ledger fee is denominated in. */
export const ODIN_BTC_TOKEN_ID = "btc";

/**
 * Flat BTC fee the Odin ledger charges the SENDER on every transfer, in
 * millisatoshis (1 sat = 1000 millisat → 100 sats). Payouts pull this much BTC
 * from the winner (icrc2_transfer_from) to fund the outbound transfer's own
 * fee, so the canister needs no maintainer-seeded BTC float.
 *
 * NOTE: pulling BTC is itself a transfer, so the ledger charges the winner a
 * second fee on the pull (debited from the caller's BTC, per ICRC-2). The
 * frontend therefore approves 2x this value; the canister nets zero.
 *
 * ⚠️ Verify this constant against the live Odin ledger before mainnet. If it is
 * lower than the real fee, the first payout on an empty-float canister fails
 * with error 910; if higher, the canister slowly accumulates a BTC surplus.
 */
export const ODIN_BTC_FEE = 100_000n;

const Account = IDL.Record({
  owner: IDL.Principal,
  subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
});

const TransferFromArgs = IDL.Record({
  spender_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
  from: Account,
  to: Account,
  amount: IDL.Nat,
  fee: IDL.Opt(IDL.Nat),
  memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
  created_at_time: IDL.Opt(IDL.Nat64),
});

const TransferArgs = IDL.Record({
  from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
  to: Account,
  amount: IDL.Nat,
  fee: IDL.Opt(IDL.Nat),
  memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
  created_at_time: IDL.Opt(IDL.Nat64),
});

const TransferError = IDL.Variant({
  BadFee: IDL.Record({ expected_fee: IDL.Nat }),
  BadBurn: IDL.Record({ min_burn_amount: IDL.Nat }),
  InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
  InsufficientAllowance: IDL.Record({ allowance: IDL.Nat }),
  TooOld: IDL.Null,
  CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
  Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
  TemporarilyUnavailable: IDL.Null,
  GenericError: IDL.Record({ error_code: IDL.Nat, message: IDL.Text }),
});

const TransferResult = IDL.Variant({ Ok: IDL.Nat, Err: TransferError });

type TransferResultValue = { Ok: bigint } | { Err: Record<string, unknown> };

/** JSON.stringify replacer — ICRC error records carry Nat (bigint) fields. */
function stringifyError(err: Record<string, unknown>): string {
  return JSON.stringify(err, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
}

/**
 * The subaccount under which `tokenId`'s balance is stored on the Odin ledger.
 * Both the depositor's approval and this canister's holdings live here.
 */
export async function tokenPointer(
  ledger: Principal,
  tokenId: string,
): Promise<Uint8Array> {
  return await call<[string], Uint8Array>(ledger, "odin_token_pointer", {
    args: [tokenId],
    paramIdlTypes: [IDL.Text],
    returnIdlType: IDL.Vec(IDL.Nat8),
  });
}

/**
 * Pull `amount` of `tokenId` from `from` into `to` using the ICRC-2 allowance
 * the depositor granted (spender = `to`). Returns the block index; throws with
 * the decoded error on failure.
 */
export async function odinPullToken(
  ledger: Principal,
  tokenId: string,
  from: Principal,
  to: Principal,
  amount: bigint,
): Promise<bigint> {
  const subaccount = await tokenPointer(ledger, tokenId);
  const result = await call<[unknown], TransferResultValue>(
    ledger,
    "icrc2_transfer_from",
    {
      args: [
        {
          // Odin ledger requires spender_subaccount == from.subaccount
          // (the per-token pointer); a mismatch traps with error 914.
          spender_subaccount: [subaccount],
          from: { owner: from, subaccount: [subaccount] },
          to: { owner: to, subaccount: [subaccount] },
          amount,
          fee: [],
          memo: [],
          created_at_time: [],
        },
      ],
      paramIdlTypes: [TransferFromArgs],
      returnIdlType: TransferResult,
    },
  );

  if ("Err" in result) {
    throw new Error(`Odin transfer_from failed: ${stringifyError(result.Err)}`);
  }

  return result.Ok;
}

/**
 * Send `amount` of `tokenId` from this canister's per-token subaccount to
 * `to`'s per-token subaccount on the Odin ledger. Returns the block index;
 * throws with the decoded error on failure so the caller can revert.
 */
export async function odinSendToken(
  ledger: Principal,
  tokenId: string,
  to: Principal,
  amount: bigint,
): Promise<bigint> {
  const subaccount = await tokenPointer(ledger, tokenId);
  const result = await call<[unknown], TransferResultValue>(
    ledger,
    "icrc1_transfer",
    {
      args: [
        {
          from_subaccount: [subaccount],
          to: { owner: to, subaccount: [subaccount] },
          amount,
          fee: [],
          memo: [],
          created_at_time: [],
        },
      ],
      paramIdlTypes: [TransferArgs],
      returnIdlType: TransferResult,
    },
  );

  if ("Err" in result) {
    throw new Error(`Odin transfer failed: ${stringifyError(result.Err)}`);
  }

  return result.Ok;
}
