/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ODIN_APP_NAME?: string;
  // Validated at runtime by `parseOdinEnv` in `src/odin/client.ts`.
  readonly VITE_ODIN_ENV?: string;
  readonly VITE_STAKING_CANISTER_ID?: string;
  readonly VITE_TOKEN_ID?: string;
  readonly VITE_IC_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
