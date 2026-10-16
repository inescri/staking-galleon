# AI_INSTRUCTIONS — `@staking-galleon/frontend`

Rules for working inside the frontend package. Read alongside the root
[`CLAUDE.md`](../../CLAUDE.md).

## What this package is

A Vite + React + TypeScript app: log in with Odin Connect, show the player's
doubloon balance, and drive the stake / extend / withdraw flows against the
external staking canister.

```
src/
  main.tsx          # React entry (GameProvider → WalletProvider → App)
  App.tsx           # root component
  odin/             # odin-connect 2.x integration (single client, state hook,
                    #   auth status + approval-flow helpers, unit tests)
  contexts/         # GameContext (reducer, localStorage) + WalletContext
  canister/         # config (env), actor factory, Candid types
  hooks/            # useStakingCanister, useCountdown
  components/       # UI
  utils/            # tiers, formatting, game helpers
index.html          # Vite html entry
vite.config.ts      # build config (outDir: dist → served by the asset canister)
```

## Hard rules

1. **Never trust the client for accounting.** The staking canister is the
   source of truth for balances and positions. The UI displays and requests;
   it must not assume a call succeeded until the canister confirms.
2. **On-chain amounts are `bigint`.** Convert with `OdinUtils.convertToOdinAmount`
   and pass the bigint through to the canister untouched.
3. **Do not hardcode secrets or canister ids.** Read them from
   `src/canister/config.ts` (Vite env with defaults).
4. **Keep types honest.** Strict mode is on; no `any` or `// @ts-ignore`.

## odin-connect 2.x

- One instance: `src/odin/client.ts`. Never `new OdinConnect` elsewhere.
- Render from `useOdinState()` (via `useWallet()`), never from an awaited
  `connect()` / `icrcApprove()`: in wallet in-app browsers the SDK redirects
  and the page reloads before the promise returns.
- Start actions from handlers with `void user.icrcApprove({ …, returnState })`;
  handle the outcome in an effect keyed on `request` using
  `approvalFor(request, "stake")`, read the amount from `request.input` and
  everything else from `returnState`, and `claimRequest(id)` before the
  canister call so it runs at most once.
- Never auto-retry `connect()` after `rejected` / `unverified`.
- See `node_modules/odin-connect/MIGRATION-2.0.md` and the template's README.

## Conventions

- Function components + hooks. No class components.
- 2-space indentation, double quotes, semicolons — prettier defaults.
- Keep `App.tsx` thin; flows live in components/hooks.

## Build & test

```sh
pnpm --filter @staking-galleon/frontend dev
pnpm --filter @staking-galleon/frontend build    # tsc -b && vite build → dist/
pnpm --filter @staking-galleon/frontend lint
pnpm --filter @staking-galleon/frontend typecheck
pnpm --filter @staking-galleon/frontend test
```
