import type { Tier } from "../utils/rewards";

interface ShipSpriteProps {
  tier: Tier;
  progress: number;
  size?: number;
}

const SHIP_CHARS: Record<Tier, string> = {
  coastal: "\u26F5",
  open_sea: "\u{1F6A2}",
  deep_ocean: "\u{1F6F3}\uFE0F",
  kraken_waters: "\u{1F3F4}\u200D\u2620\uFE0F",
};

export function ShipSprite({ tier, progress, size = 32 }: ShipSpriteProps) {
  return (
    <div
      className={`ship-sprite ship-sailing`}
      style={{
        left: `${5 + progress * 85}%`,
        fontSize: `${size}px`,
        animationDelay: `${progress * 500}ms`,
      }}
    >
      {SHIP_CHARS[tier]}
    </div>
  );
}
