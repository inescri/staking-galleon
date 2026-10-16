# AI_INSTRUCTIONS — `@staking-galleon/canister`

Rules for working inside the Azle canister package. Read alongside the root
[`CLAUDE.md`](../../CLAUDE.md).

## What this package is

An Azle (TypeScript → wasm, stable mode) canister that owns the Galleon
Stakes game rules: fixed-stake voyages per difficulty, an on-chain outcome
roll, and a house pool that backs every promised reward.

```
src/
  index.ts          # canister class — endpoints, StableBTreeMaps, await ordering
  game.ts           # pure logic: types, config validation, roll, pool accounting
  default_config.ts # pure: seeded difficulties / durations, token base units
  candid.ts         # IDL mirrors + converters (variants, opt, principal)
  odin.ts           # Odin ledger client (icrc2_transfer_from / icrc1_transfer)
  game.test.ts      # vitest for the pure modules
```

## Hard rules

1. **Do not edit the hardened pool core** in `game.ts` between the
   `BEGIN/END HARDENED POOL CORE` markers, nor the `⚠️ AI-GUARD` sections in
   `index.ts`, without explicit maintainer sign-off. They guard real funds.
2. **Effects before interactions.** Every `await` of a cross-canister call is
   preceded by the persisted state change it depends on — the ship status lock
   (`launching`, `settling`, `paying`), the pool reservation — and followed by
   an explicit revert on failure. Azle processes other messages at await
   points; reordering opens double-launch / double-settle / double-pay.
3. **Never trap after an await that moved money.** Post-await effect code is
   wrapped in try/catch and returns `Err`; a trap would leave a status lock
   with no recorded outcome.
4. **Ships snapshot their rules at launch** (`stake`, `failBps`,
   `multiplierBps`, `reservedReward`). `set_config` must never read or change
   a ship at sea.
5. **Amounts are `bigint`** (Candid `Nat`). Timestamps are milliseconds
   (`time() / 1_000_000n`). Validate every update-call input.
6. **StableBTreeMap memory ids are permanent.** Current ids: `0` meta,
   `1` gameConfig, `2` ships, `3` shipsByOwner, `4` pool, `5` counters. Never
   reuse or renumber; add new maps with new ids. No `preUpgrade`/`postUpgrade`;
   every read falls back to a default so an upgrade with a missing key works.

## Patterns to follow

- Put new logic in `game.ts` (runtime-free) and unit-test it. Anything that
  imports `azle` cannot run under plain vitest.
- Endpoints use stable decorators with explicit `IDL` types; Candid shapes
  live in `candid.ts`, with converters to/from the pure types.
- Update calls return `Result = Variant { Ok, Err: text }` with the stable
  error codes in `ERR` (the frontend matches on them). Returning `Err` does
  not roll back state — revert explicitly.
- Randomness only via the management canister's `raw_rand`, only inside an
  update, only after the ship is locked.

## Build & test

```sh
pnpm --filter @staking-galleon/canister test   # vitest
pnpm build:canister                            # dfx build canister --check (repo root)
```

Plain `tsc` on this package fails because Azle ships raw `.ts`; the Azle
compiler (`dfx build`) is the real type gate. Requires `rustup target add
wasm32-unknown-unknown`, dfx 0.31+, and the repo's `.npmrc`
(`node-linker=hoisted`) so Azle's `npm exec` finds its binaries.
