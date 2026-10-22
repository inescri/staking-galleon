import { useGameState } from "./contexts/useGame";
import { useParallax } from "./hooks/useParallax";
import { useT } from "./i18n/useLocale";
import { LanguageToggle } from "./components/LanguageToggle";
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
  const t = useT();

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
        <LanguageToggle />
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
            <span className="title-main">{t("app.titleMain")}</span>
            <span className="title-sub">{t("app.titleSub")}</span>
          </span>
        </h1>
        <p className="game-subtitle">{t("app.subtitle")}</p>
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
        <p>{t("app.footer")}</p>
      </footer>
    </div>
  );
}
