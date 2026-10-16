# Galleon Stakes

A pirate-themed token staking game built on the Internet Computer blockchain. Stake doubloon tokens on maritime expeditions of varying risk and duration to earn rewards.

## Tech Stack

- **React 19** + **TypeScript** + **Vite**
- **@dfinity/agent** — Internet Computer blockchain interaction
- **odin-connect 2.x** — Wallet connection (state store; works in wallet in-app browsers)
- **pnpm workspace** — layout mirrors `odin-app-template` (frontend package only)
- Pixel-art retro UI with custom CSS

## Features

- **Wallet Integration** — Connect via Odin wallet, view principal address and token balance
- **Tiered Expeditions** — Choose from 4 risk tiers (Coastal Trade → Kraken Waters) with increasing duration and reward potential
- **Fleet Management** — Run up to 5 concurrent expeditions with real-time countdown timers
- **Animated Harbor** — Visual harbor scene with animated ships, waves, and clouds
- **On-chain Staking** — Deposit, lock, unlock, and withdraw tokens via a staking canister
- **Voyage Log** — Track completed expeditions and rewards

## Project Structure

```
packages/frontend/
├── src/
│   ├── components/    # UI components (Treasury, Harbor, SendShipForm, FleetStatus, etc.)
│   ├── contexts/      # React context providers (GameContext, WalletContext)
│   ├── odin/          # odin-connect 2.x client, state hook, auth/approval helpers
│   ├── hooks/         # Custom hooks (useStakingCanister, useCountdown)
│   ├── canister/      # Env config, IC actor factory and Candid types
│   ├── utils/         # Tier configs and formatting helpers
│   ├── App.tsx
│   └── main.tsx
├── .env.example       # VITE_ODIN_ENV, canister / token ids
└── AI_INSTRUCTIONS.md
dfx.json               # frontend asset canister
CLAUDE.md
```

## Getting Started

Requires Node 22+ (`.nvmrc`) and pnpm 10+.

```bash
pnpm install
pnpm dev:frontend
```

Open `http://localhost:5173`, connect your Odin wallet, and start launching expeditions.

## Scripts

| Command              | Description                           |
| -------------------- | ------------------------------------- |
| `pnpm dev:frontend`  | Start dev server with HMR             |
| `pnpm build`         | TypeScript compile + production build |
| `pnpm lint`          | Run ESLint                            |
| `pnpm typecheck`     | Type-check                            |
| `pnpm test`          | Run unit tests (vitest)               |

## Configuration

- **Staking Canister**: `sfgyi-iyaaa-aaaam-qepyq-cai`
- **Token ID**: `2j5i`
- **Wallet**: Odin Connect (`dev` environment by default)

All of the above come from Vite env with defaults — see
`packages/frontend/.env.example`.

## Odin Connect 2.x

Auth and approvals render from the SDK state store (`src/odin/`): `connect()`
and `icrcApprove()` are started from buttons without awaiting; the stake
follow-up runs from an effect once the approval request is `success`. This is
what keeps the game working inside wallet in-app browsers (OKX, Xverse), where
the SDK redirects to Odin and the page reloads.

> All deposits are mocked. No real tokens involved.
