# Galleon Stakes

A pirate-themed voyage staking game on [Odin Fun](https://odin.fun), running on
the Internet Computer. Stake doubloons on a voyage, pick how long and how risky,
and find out on return whether the ship comes back with a bounty or goes down
with the stake.

## How it plays

- **Four difficulties** — Coastal Trade, Open Sea, Deep Ocean, Kraken Waters.
  Each has **one fixed stake** (100 / 500 / 1 000 / 5 000 dbl by default) and
  a **menu of durations** (hours to days). Every duration carries its own
  **fail chance** and **reward multiplier**; the canister is the source of
  truth for all of them (`get_config`).
- **Launch** approves the stake (ICRC-2) and calls `launch(difficulty,
durationIndex)`. Up to 5 ships can be at sea per player.
- **Return Ship** calls `settle(shipId)`. The canister rolls the outcome with
  the IC's `raw_rand`: a win pays stake + reward, a loss sends the whole stake
  to the house pool.
- **The house pool** (admin deposits + lost stakes) funds every reward. The
  reward is reserved at launch, so a win is always backed; when the pool
  cannot cover a voyage the launch is refused (`POOL_INSUFFICIENT`).
- **The winner pays the Odin ledger fee**: before Return Ship the app asks for
  a small BTC approval, which the canister pulls to fund the payout transfer.

## Tech stack

- **Azle 0.33** (TypeScript → wasm, stable mode) game canister
- **React 19** + **TypeScript** + **Vite 8** frontend
- **odin-connect 2.x** — wallet, delegation and ICRC-2 approvals (works in
  wallet in-app browsers via redirect mode)
- **@dfinity/agent** — canister calls
- **pnpm workspace** — layout mirrors `odin-app-template`

## Project structure

```
packages/
  canister/
    src/index.ts          # canister class: endpoints, stable maps, await ordering
    src/game.ts           # pure rules: config validation, roll, pool accounting (+ tests)
    src/default_config.ts # seeded difficulties / durations
    src/candid.ts         # IDL mirrors and converters
    src/odin.ts           # Odin ledger client
  frontend/
    src/canister/         # env config, actor factory, hand-written IDL
    src/odin/             # odin-connect client, state hook, approval flows
    src/contexts/         # GameContext (reducer) + WalletContext
    src/hooks/            # useGameCanister, useCountdown
    src/components/       # Treasury, Harbor, SendShipForm, FleetStatus, …
    src/utils/            # ship ↔ expedition mapping, tier display meta, formatting
dfx.json                  # `canister` (azle) + `frontend` (assets)
.npmrc                    # node-linker=hoisted (required by Azle's build)
```

## Prerequisites

- Node 22+ (`.nvmrc`), pnpm 10+
- [dfx](https://internetcomputer.org/docs/building-apps/getting-started/install) 0.31+
- Rust with the wasm target: `rustup target add wasm32-unknown-unknown`

## Quick start

```bash
pnpm install                     # also installs the Azle dfx extension
dfx start --clean --background
dfx deploy canister --argument '(record { ledger_id = principal "w5cxm-6iaaa-aaaaj-az4jq-cai"; token_id = "hjun" })'
pnpm dev:frontend
```

`dfx deploy` writes the canister id to the root `.env`; the frontend's
`vite.config.ts` picks it up, so `http://localhost:5173` renders the
difficulties and durations straight from the local canister.

A local replica can only serve the read paths. Connecting and staking need a
canister that Odin's signer and the Odin ledger can reach, i.e. one deployed
to mainnet — see **Deploy**.

## Scripts

| Command               | Description                                   |
| --------------------- | --------------------------------------------- |
| `pnpm dev:frontend`   | Vite dev server with HMR                      |
| `pnpm build`          | Frontend production build (what Netlify runs) |
| `pnpm build:canister` | `dfx build canister --check`                  |
| `pnpm lint`           | ESLint                                        |
| `pnpm typecheck`      | `tsc -b` (the canister is typed by dfx build) |
| `pnpm test`           | vitest: canister rules + frontend helpers     |

## Canister API

| Method                                  | Kind   | Notes                                                    |
| --------------------------------------- | ------ | -------------------------------------------------------- |
| `launch(difficulty, durationIndex)`     | update | Pulls the fixed stake; `Ok(shipId)`                      |
| `settle(shipId)`                        | update | Owner, after `endsAt`; rolls and pays                    |
| `claim(shipId)`                         | update | Retry the payout of a won ship                           |
| `get_my_ships()` / `get_ships(owner)`   | query  | Ships at sea and settled (bounded)                       |
| `get_config()`                          | query  | Difficulties, stakes, durations, `maxShips`              |
| `get_pool_stats()`                      | query  | `available / reserved / activeStakes / pendingPayouts`   |
| `fund_pool(amount)`                     | update | Anyone; pulls pre-approved tokens into the pool          |
| `withdraw_pool(amount)`                 | update | Admin                                                    |
| `set_config`, `set_paused`, `set_owner` | update | Admin; ships at sea keep their launch-time rules         |
| `set_ledger_id`, `set_token_id`         | update | Admin; only while no ship launched and the pool is empty |
| `admin_recover_ship(shipId, status)`    | update | Admin; unstick a verified `settling` / `paying` ship     |
| `icrc28_trusted_origins()`              | update | Origins allowed to request delegations                   |

Errors come back as `Err: text` with stable codes (`POOL_INSUFFICIENT`,
`FLEET_FULL`, `SHIP_STILL_AT_SEA`, `PAYOUT_FAILED:…`, …).

## Deployed canisters

| Network | Canister                      | Ledger                                 |
| ------- | ----------------------------- | -------------------------------------- |
| ic      | `gkvcg-5aaaa-aaaae-qkpzq-cai` | Odin dev `w5cxm-6iaaa-aaaaj-az4jq-cai` |

The frontend falls back to this id when neither `VITE_APP_CANISTER_ID` nor a
dfx-bridged id is set. `canister_ids.json` is gitignored.

## Configuration

Frontend (`packages/frontend/.env.example`):

- `VITE_ODIN_ENV` — `dev` by default; must match the ledger the canister was
  deployed with (dev `w5cxm-6iaaa-aaaaj-az4jq-cai`, prod/staging
  `yspgd-ciaaa-aaaaj-a6rrq-cai`).
- `VITE_APP_CANISTER_ID` — overrides the id bridged from the root `.env`.
- `VITE_DFX_NETWORK` — `ic` (default) or `local`.
- `VITE_TOKEN_ID` — `hjun`.
- `VITE_ADMIN_PRINCIPALS` — comma-separated principals shown the treasury
  deposit form (UI gate only; `fund_pool` is open on the canister).
- `VITE_BUY_SATS` — sats the Treasury "Buy" button spends per click
  (default 20000).

Canister: `ledger_id` and `token_id` are init arguments; the admin can change
them with `set_ledger_id` / `set_token_id` until the first launch or pool
deposit (`NOT_PRISTINE` afterwards, since funds live on that ledger). Difficulties live in
`packages/canister/src/default_config.ts` and can be replaced at runtime with
`set_config`. `TRUSTED_ORIGINS` in `src/index.ts` lists localhost and
`https://galleon-expeditions.netlify.app`; add any other hosted origin
before deploying there.

## Deploy

1. Edit `TRUSTED_ORIGINS` in `packages/canister/src/index.ts`.
2. `dfx deploy --network ic canister --argument '(record { ledger_id = principal "<ledger>"; token_id = "hjun" })'`
3. `dfx canister call canister icrc28_trusted_origins '()' --network ic`
4. Seed the pool: approve the canister for the game token from the admin's
   Odin account, then `dfx canister call canister fund_pool '(<base units>)' --network ic`.
   A Kraken Waters 7d voyage reserves 7 250 dbl, so size the pool for the
   tiers you want launchable.
5. Set `VITE_APP_CANISTER_ID` (and `VITE_ODIN_ENV`) for the hosted frontend
   and `pnpm build`.

Before mainnet, verify `ODIN_BTC_FEE` in `packages/canister/src/odin.ts`
against the live ledger: too low and the first payout fails with error 910.

## Odin Connect 2.x

Auth and approvals render from the SDK state store (`src/odin/`): `connect()`
and `icrcApprove()` are started from buttons without awaiting; the `launch`
and `settle` follow-ups run from effects once the approval request is
`success`, keyed by a `returnState` tag and claimed once per request id. This
is what keeps the game working inside wallet in-app browsers (OKX, Xverse),
where the SDK redirects to Odin and the page reloads.
