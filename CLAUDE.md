# CLAUDE.md — AI assistant guide for staking-galleon

This file tells AI coding assistants (Claude Code and others) how to work in
this repository. **Read it before editing.** Frontend-specific rules live in
`packages/frontend/AI_INSTRUCTIONS.md`.

Galleon Stakes is a pirate-themed staking game on Odin Fun. Its layout follows
the `odin-app-template` reference, minus the canister package: the game talks to
an existing, externally deployed staking canister.

## Project shape

```
packages/
  frontend/   # Vite + React app — Odin Connect auth + staking UI
dfx.json      # frontend asset canister config (for `dfx deploy`)
```

Stack: React 19 + Vite 8 · TypeScript strict · pnpm workspace · Node 22 ·
odin-connect 2.x.

## Conventions

- TypeScript, strict mode. No `any`. Prefer explicit return types on exported
  functions.
- On-chain amounts are `bigint` (ICRC-1 `Nat`). Convert with
  `OdinUtils.convertToOdinAmount` at the edge; never do balance math in
  `number` for canister calls.
- Canister ids and the Odin environment come from Vite env
  (`packages/frontend/.env.example`), read in `src/canister/config.ts` and
  `src/odin/client.ts`. Do not scatter string literals.
- **odin-connect 2.x: render from state, never from an awaited call.** One
  `OdinConnect` instance lives in `src/odin/client.ts`; read it through
  `useOdinState()` / `useWallet()`. Start `connect()` and `user.<action>()`
  from handlers without awaiting them; put the follow-up in an effect keyed on
  `request.action` + `request.status` (+ a `returnState` tag), read arguments
  from `request.input` / `returnState`, and claim `request.id` with
  `claimRequest` before any value-moving call. Never call `connect()`
  automatically on a `rejected` / `unverified` request. Keep the default
  `mode: "auto"` so wallet in-app browsers work.
- 2-space indentation, double quotes, semicolons (prettier defaults) — match
  existing files. Run `pnpm exec prettier --write .` inside
  `packages/frontend` before committing.
- Conventional Commits for messages.

## Build / test

```sh
pnpm install
pnpm lint                    # eslint
pnpm typecheck               # tsc -b
pnpm test                    # vitest (pure odin helpers)
pnpm build                   # frontend dist
pnpm dev:frontend            # Vite dev server
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, test and the frontend
build on every push/PR. Do not merge red.
