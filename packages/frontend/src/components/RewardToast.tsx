import { useEffect } from "react";
import { useGameDispatch } from "../contexts/useGame";
import type { CompletedExpedition } from "../contexts/GameContext";
import { useWallet } from "../contexts/useWallet";
import { useLocale, useT } from "../i18n/useLocale";
import { formatTl } from "../utils/rewards";
import { TierIcon } from "./TierIcon";

export function RewardToast({
  expedition,
}: {
  expedition: CompletedExpedition;
}) {
  const dispatch = useGameDispatch();
  const { token } = useWallet();
  const { locale } = useLocale();
  const t = useT();

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch({ type: "DISMISS_RETURN", payload: { id: expedition.id } });
    }, 5000);
    return () => clearTimeout(timer);
  }, [dispatch, expedition.id]);

  const won = expedition.succeeded;
  const profit = expedition.payout - expedition.stake;

  return (
    <div
      className={`reward-toast ${won ? "toast-profit" : "toast-loss"}`}
      onClick={() =>
        dispatch({ type: "DISMISS_RETURN", payload: { id: expedition.id } })
      }
    >
      <span className="toast-icon">
        {won ? (
          <TierIcon tier={expedition.tier} className="tier-icon-toast" />
        ) : (
          "\u{1F480}"
        )}
      </span>
      <div className="toast-content">
        <span className="toast-title">
          {won ? t("toast.returned") : t("toast.lost")}
        </span>
        <span className="toast-result">
          {won
            ? t("toast.bounty", {
                profit: formatTl(profit, token, locale, "+"),
                payout: formatTl(expedition.payout, token, locale),
              })
            : t("toast.sunk", {
                stake: formatTl(expedition.stake, token, locale, "\u2212"),
              })}
        </span>
      </div>
    </div>
  );
}
