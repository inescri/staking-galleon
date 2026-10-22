# AI_INSTRUCTIONS — `@staking-galleon/frontend`

Rules for working inside the frontend package. Read alongside the root
[`CLAUDE.md`](../../CLAUDE.md).

## What this package is

A Vite + React + TypeScript app: log in with Odin Connect, show the player's
doubloon balance, and drive the launch / return-ship flows against the game
canister in `packages/canister`.

```
src/
  main.tsx          # React entry (LocaleProvider → GameProvider → WalletProvider → App)
  App.tsx           # root component
  odin/             # odin-connect 2.x integration (single client, state hook,
                    #   auth status + approval-flow helpers, unit tests)
  contexts/         # GameContext (reducer) + WalletContext
  i18n/             # en.ts (source of truth) + zh.ts messages, translate(),
                    #   locale detection/storage, LocaleProvider + useT()
  canister/         # config (env), actor factory, hand-written IDL (idl.ts)
  hooks/            # useGameCanister, useCountdown
  components/       # UI
  utils/            # tiers, formatting, error mapping, game helpers
index.html          # Vite html entry
vite.config.ts      # build config (outDir: dist → served by the asset canister)
```

## Hard rules

1. **Never trust the client for accounting.** The game canister is the
   source of truth for ships, outcomes and balances: `SYNC_SHIPS` replaces the
   fleet wholesale from `get_my_ships`; nothing game-related is persisted in
   localStorage. The only localStorage key is `redsail.locale` (a UI
   preference). The UI displays and requests; it must not assume a call
   succeeded until the canister confirms.
2. **On-chain amounts are `bigint`** and come from the canister (`get_config`
   stakes, ship records). Pass them through untouched; format for display with
   `formatUnits(amount, token, locale)`.
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
  `approvalFor(request, "stake" | "settle")`, read the choice from
  `returnState`, and `claimRequest(id)` before the canister call so it runs
  at most once. Three flows exist: `stake` (approve the game token for the
  fixed stake → `launch`), `settle` (approve the BTC payout fee →
  `settle` / `claim`) and `fund` (approve a treasury deposit → `fund_pool`).
- Never auto-retry `connect()` after `rejected` / `unverified`.
- See `node_modules/odin-connect/MIGRATION-2.0.md` and the template's README.

## Conventions

- Function components + hooks. No class components.
- 2-space indentation, double quotes, semicolons — prettier defaults.
- Keep `App.tsx` thin; flows live in components/hooks.

## Localization (en / zh)

- No user-facing literals in JSX, `alt`, `title`, `placeholder`,
  `aria-label` or CSS `content`. Add the key to `src/i18n/en.ts` **and**
  `src/i18n/zh.ts` (tsc and `messages.test.ts` fail on a mismatch, including
  differing `{param}` tokens) and render it with `const t = useT()`.
- Text produced outside render (errors, status messages) is stored as
  `UiText` (`{ key, params? }` or `{ raw }`) and rendered with
  `resolveText(t, text)`, so it follows the language toggle. SDK and unknown
  canister messages stay `{ raw }`.
- Formatters in `utils/rewards.ts` take a `locale` from `useLocale()`; pass
  pre-formatted numbers and amounts as params.
- Tier and wear names are the `tier.*` / `wear.*` keys; never render the
  canister's English `name` / `label` fields.
- Exception: the `EN` / `中文` language names in `LanguageToggle.tsx`.

## Build & test

```sh
pnpm --filter @staking-galleon/frontend dev
pnpm --filter @staking-galleon/frontend build    # tsc -b && vite build → dist/
pnpm --filter @staking-galleon/frontend lint
pnpm --filter @staking-galleon/frontend typecheck
pnpm --filter @staking-galleon/frontend test
```
