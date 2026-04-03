import { useGameState } from "./contexts/GameContext";
import { ConnectOdin } from "./components/ConnectOdin";
import { Treasury } from "./components/Treasury";
import { Harbor } from "./components/Harbor";
import { SendShipForm } from "./components/SendShipForm";
import { FleetStatus } from "./components/FleetStatus";
import { RewardToast } from "./components/RewardToast";
import { DispatchToast } from "./components/DispatchToast";

export function App() {
  const { pendingReturns, pendingDispatches } = useGameState();

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
        <h1 className="game-title">Galleon Stakes</h1>
        <p className="game-subtitle">Send ships. Stake doubloons. Reap the bounty.</p>
      </header>

      <main className="app-main">
        <ConnectOdin />
        <Treasury />
        <Harbor />
        <SendShipForm />
        <FleetStatus />
      </main>

      <footer className="app-footer">
        <p>All deposits are mocked. No real tokens involved.</p>
      </footer>
    </div>
  );
}
