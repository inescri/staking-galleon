import { useGameState } from "./contexts/useGame";
import { useParallax } from "./hooks/useParallax";
import { ConnectOdin } from "./components/ConnectOdin";
import { Treasury } from "./components/Treasury";
import { Harbor } from "./components/Harbor";
import { SendShipForm } from "./components/SendShipForm";
import { FleetStatus } from "./components/FleetStatus";
import { VoyageLog } from "./components/VoyageLog";
import { RewardToast } from "./components/RewardToast";
import { DispatchToast } from "./components/DispatchToast";
import shipImage from "./assets/ships/ship.png";

export function App() {
  const { pendingReturns, pendingDispatches } = useGameState();
  useParallax();

  return (
    <div className="app">
      <div className="toast-container">
        {pendingDispatches.map((exp) => (
          <DispatchToast key={exp.id} expedition={exp} />
        ))}
        {pendingReturns.map((exp) => (
          <RewardToast key={exp.id} expedition={exp} />
        ))}
      </div>

      <header className="app-header">
        <h1 className="game-title">
          <img
            className="title-ship"
            src={shipImage}
            alt=""
            width={64}
            height={64}
            draggable={false}
          />
          <span className="title-text">
            <span className="title-main">Red Sail</span>
            <span className="title-sub">Stakes</span>
          </span>
        </h1>
        <p className="game-subtitle">
          Send ships. Stake doubloons. Reap the bounty.
        </p>
      </header>

      <main className="app-main">
        <ConnectOdin />
        <Treasury />
        <Harbor />
        <SendShipForm />
        <FleetStatus />
        <VoyageLog />
      </main>

      <footer className="app-footer">
        <p>
          Every voyage risks its whole stake. Lost stakes feed the treasury that
          pays the winners.
        </p>
      </footer>
    </div>
  );
}
