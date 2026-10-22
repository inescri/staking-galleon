import shipImage from "../assets/ships/ship.png";
import { wearLevel } from "../utils/wear";
import { useT } from "../i18n/useLocale";
import type { Tier } from "../utils/rewards";

interface ShipImageProps {
  /** How long the ship has been at sea. Drives the wear look. */
  elapsedMs: number;
  /** Names the ship's tier in its alt text when set. */
  tier?: Tier;
  size?: number;
  className?: string;
}

/** The one ship sprite, weathered by time at sea (see utils/wear.ts). */
export function ShipImage({
  elapsedMs,
  tier,
  size = 32,
  className = "",
}: ShipImageProps) {
  const t = useT();
  const wear = wearLevel(elapsedMs);
  const wearText = t(`wear.${wear}`);
  return (
    <img
      className={`ship-image ship-wear-${wear} ${className}`.trim()}
      src={shipImage}
      alt={
        tier
          ? t("ship.altWithTier", { tier: t(`tier.${tier}`), wear: wearText })
          : t("ship.alt", { wear: wearText })
      }
      width={size}
      height={size}
      draggable={false}
    />
  );
}
