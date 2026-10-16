import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GameProvider } from "./contexts/GameContext";
import { WalletProvider } from "./contexts/WalletContext";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GameProvider>
      <WalletProvider>
        <App />
      </WalletProvider>
    </GameProvider>
  </StrictMode>,
);
