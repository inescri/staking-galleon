# Galleon Stakes

A pirate-themed token staking game built on the Internet Computer blockchain. Stake doubloon tokens on maritime expeditions of varying risk and duration to earn rewards.

## Tech Stack

- **React 19** + **TypeScript** + **Vite**
- **@dfinity/agent** — Internet Computer blockchain interaction
- **odin-connect** — Wallet connection
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
src/
├── components/        # UI components (Treasury, Harbor, SendShipForm, FleetStatus, etc.)
├── contexts/          # React context providers (GameContext, WalletContext)
├── hooks/             # Custom hooks (useStakingCanister, useCountdown)
├── canister/          # IC canister actor factory and Candid types
├── utils/             # Tier configs and formatting helpers
├── App.tsx
└── main.tsx
```

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, connect your Odin wallet, and start launching expeditions.

## Scripts

| Command             | Description                        |
| ------------------- | ---------------------------------- |
| `npm run dev`       | Start dev server with HMR          |
| `npm run build`     | TypeScript compile + production build |
| `npm run preview`   | Preview production build locally   |
| `npm run lint`      | Run ESLint                         |

## Configuration

- **Staking Canister**: `sfgyi-iyaaa-aaaam-qepyq-cai`
- **Token ID**: `2j5i`
- **Wallet**: Odin Connect (preview environment)

> All deposits are mocked. No real tokens involved.
