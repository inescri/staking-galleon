import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // `dfx deploy` writes `CANISTER_ID_CANISTER` / `DFX_NETWORK` to the repo
  // root `.env`; bridge them so a local deploy needs no manual copying.
  // An explicit `VITE_APP_CANISTER_ID` in this package's `.env` still wins.
  const dfx = loadEnv(mode, path.resolve(__dirname, "../.."), [
    "CANISTER_ID_",
    "DFX_NETWORK",
  ]);
  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_DFX_CANISTER_ID": JSON.stringify(
        dfx.CANISTER_ID_CANISTER ?? "",
      ),
      "import.meta.env.VITE_DFX_NETWORK_FROM_DFX": JSON.stringify(
        dfx.DFX_NETWORK ?? "",
      ),
    },
    // Force a single React instance. The pnpm workspace can otherwise resolve a
    // second copy for React-context libraries, which trips "Invalid hook call"
    // in the dev server.
    resolve: {
      dedupe: ["react", "react-dom"],
    },
  };
});
