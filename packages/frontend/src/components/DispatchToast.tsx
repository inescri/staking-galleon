import { useEffect } from "react";
import { useGameDispatch } from "../contexts/useGame";
import type { DispatchedExpedition } from "../contexts/GameContext";
import { useWallet } from "../contexts/useWallet";
import { useLocale, useT } from "../i18n/useLocale";
import { formatTl } from "../utils/rewards";
import { TierIcon } from "./TierIcon";

export function DispatchToast({
  expedition,
}: {
  expedition: DispatchedExpedition;
}) {
  const dispatch = useGameDispatch();
  const { token } = useWallet();
  const { locale } = useLocale();
  const t = useT();

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch({ type: "DISMISS_DISPATCH", payload: { id: expedition.id } });
    }, 4000);
    return () => clearTimeout(timer);
  }, [dispatch, expedition.id]);

  return (
    <div
      className="reward-toast toast-dispatched"
      onClick={() =>
        dispatch({ type: "DISMISS_DISPATCH", payload: { id: expedition.id } })
      }
    >
      <span className="toast-icon">
        <TierIcon tier={expedition.tier} className="tier-icon-toast" />
      </span>
      <div className="toast-content">
        <span className="toast-title">{t("toast.dispatched")}</span>
        <span className="toast-result">
          {t("toast.staked", {
            amount: formatTl(expedition.stake, token, locale),
          })}
        </span>
      </div>
    </div>
  );
}
