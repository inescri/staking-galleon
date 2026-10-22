import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GameProvider } from "./contexts/GameContext";
import { WalletProvider } from "./contexts/WalletContext";
import { LocaleProvider } from "./i18n/LocaleProvider";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LocaleProvider>
      <GameProvider>
        <WalletProvider>
          <App />
        </WalletProvider>
      </GameProvider>
    </LocaleProvider>
  </StrictMode>,
);
