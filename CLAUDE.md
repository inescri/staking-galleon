# CLAUDE.md — AI assistant guide for staking-galleon

This file tells AI coding assistants (Claude Code and others) how to work in
this repository. **Read it before editing.** Package-specific rules live in
`packages/frontend/AI_INSTRUCTIONS.md` and `packages/canister/AI_INSTRUCTIONS.md`.

Red Sail Stakes is a pirate-themed voyage staking game on Odin Fun. Its layout
follows the `odin-app-template` reference: an Azle canister that owns the game
rules and funds, and a Vite + React frontend that drives it through Odin
Connect.

## Project shape

```
packages/
  canister/   # Azle canister — difficulties, outcome roll, house pool, Odin ledger
  frontend/   # Vite + React app — Odin Connect auth + voyage UI
dfx.json      # `canister` (azle) + `frontend` (assets) for `dfx deploy`
.npmrc        # node-linker=hoisted — required by Azle's build; do not remove
```

Stack: React 19 + Vite 8 · TypeScript strict · pnpm workspace · Node 22 ·
odin-connect 2.x · Azle 0.33 (stable mode) · dfx 0.31+.

## Game rules (what the canister enforces)

- 4 difficulties (`coastal | open_sea | deep_ocean | kraken_waters`), each
  with ONE fixed stake and a menu of durations; every duration has its own
  fail chance (bps) and reward multiplier (bps). The frontend never computes
  amounts — it reads `get_config` and passes `(difficulty, durationIndex)`.
- Return Ship = `settle(shipId)`: `raw_rand` decides; win pays stake + reward,
  loss sends the stake to the house pool. Rewards are reserved from the pool
  at launch, so a win is always backed (`POOL_INSUFFICIENT` otherwise).
- The winner pays the Odin BTC ledger fee: the frontend approves
  `PAYOUT_FEE_APPROVAL` BTC before settle/claim.

## Conventions

- TypeScript, strict mode. No `any`. Prefer explicit return types on exported
  functions.
- On-chain amounts are `bigint` (ICRC-1 `Nat`) and come from the canister
  (`get_config` stakes, ship records). Format for display with
  `formatUnits(amount, token)`; never do balance math in `number`.
- Canister id, network and Odin environment come from Vite env
  (`packages/frontend/.env.example`), read in `src/canister/config.ts` and
  `src/odin/client.ts`. `dfx deploy` writes the id to the root `.env`, which
  `vite.config.ts` bridges. Do not scatter string literals.
- UI text is localized (English + Simplified Chinese) through
  `packages/frontend/src/i18n/`; never inline user-facing strings. See the
  Localization section of `packages/frontend/AI_INSTRUCTIONS.md`.
- **odin-connect 2.x: render from state, never from an awaited call.** One
  `OdinConnect` instance lives in `src/odin/client.ts`; read it through
  `useOdinState()` / `useWallet()`. Start `connect()` and `user.<action>()`
  from handlers without awaiting them; put the follow-up in an effect keyed on
  `request.action` + `request.status` (+ a `returnState` tag), read arguments
  from `returnState`, and claim `request.id` with `claimRequest` before any
  value-moving call. Never call `connect()` automatically on a `rejected` /
  `unverified` request. Keep the default `mode: "auto"` so wallet in-app
  browsers work.
- Canister: effects (status locks, pool reservations) are persisted before
  every cross-canister `await` and reverted explicitly on failure. See
  `packages/canister/AI_INSTRUCTIONS.md` for the memory-id table and guards.
- The hand-written IDL in `packages/frontend/src/canister/idl.ts` must match
  `.azle/canister/canister.did` after `pnpm build:canister`.
- 2-space indentation, double quotes, semicolons (prettier defaults) — match
  existing files. Run `pnpm exec prettier --write .` inside the package
  before committing.
- Conventional Commits for messages.

## Build / test

```sh
pnpm install
pnpm lint                    # eslint (frontend)
pnpm typecheck               # tsc -b (frontend; the canister is typed by dfx build)
pnpm test                    # vitest: canister game logic + frontend helpers
pnpm build                   # frontend dist (what Netlify runs)
pnpm build:canister          # dfx build canister --check (needs rustup wasm32 target)
pnpm dev:frontend            # Vite dev server

dfx start --clean --background
dfx deploy canister --argument '(record { ledger_id = principal "w5cxm-6iaaa-aaaaj-az4jq-cai"; token_id = "hjun" })'
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, test, the frontend
build and `dfx build canister --check` on every PR and push to `main`. Do not
merge red.
