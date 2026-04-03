import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GameProvider } from "./contexts/GameContext";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GameProvider>
      <App />
    </GameProvider>
  </StrictMode>
);
