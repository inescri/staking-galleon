/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ODIN_APP_NAME?: string;
  // Validated at runtime by `parseOdinEnv` in `src/odin/client.ts`.
  readonly VITE_ODIN_ENV?: string;
  readonly VITE_APP_CANISTER_ID?: string;
  readonly VITE_DFX_NETWORK?: string;
  readonly VITE_TOKEN_ID?: string;
  readonly VITE_IC_HOST?: string;
  readonly VITE_ADMIN_PRINCIPALS?: string;
  readonly VITE_BUY_SATS?: string;
  // Injected by vite.config.ts from the root `.env` dfx writes; not set by hand.
  readonly VITE_DFX_CANISTER_ID?: string;
  readonly VITE_DFX_NETWORK_FROM_DFX?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
