import { useT } from "../i18n/useLocale";
import type { Tier } from "../utils/rewards";
import { TIER_ICONS } from "../utils/tierIcons";

/** Pixel-art badge for a difficulty; sized by the surrounding CSS class. */
export function TierIcon({
  tier,
  className = "",
}: {
  tier: Tier;
  className?: string;
}) {
  const t = useT();
  return (
    <img
      className={`tier-icon ${className}`.trim()}
      src={TIER_ICONS[tier]}
      alt={t(`tier.${tier}`)}
      draggable={false}
    />
  );
}
