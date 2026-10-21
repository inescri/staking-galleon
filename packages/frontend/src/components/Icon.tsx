import type { ReactElement } from "react";

export type IconName =
  | "anchor"
  | "wallet"
  | "ship"
  | "chevron-right"
  | "link-off"
  | "star"
  | "refresh";

/** Inline stroke icons (24-unit grid) drawn in `currentColor`. */
const PATHS: Record<IconName, ReactElement> = {
  anchor: (
    <>
      <circle cx="12" cy="5" r="2.5" />
      <path d="M12 7.5V21" />
      <path d="M8 11h8" />
      <path d="M4 13a8 8 0 0 0 16 0" />
      <path d="M4 13l-1.5 1.5M4 13l1.5 1.5M20 13l-1.5 1.5M20 13l1.5 1.5" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <path d="M16 14.5h2" />
      <path d="M6 6V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </>
  ),
  ship: (
    <>
      <path d="M12 3v12" />
      <path d="M12 4l6 9h-6" />
      <path d="M12 6l-5 7h5" />
      <path d="M3 16h18l-2.5 4h-13z" />
    </>
  ),
  "chevron-right": <path d="M9 6l6 6-6 6" />,
  "link-off": (
    <>
      <path d="M9 17H7a5 5 0 0 1 0-10h2" />
      <path d="M15 7h2a5 5 0 0 1 4 8" />
      <path d="M8 12h3" />
      <path d="M3 3l18 18" />
    </>
  ),
  star: (
    <path
      d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
      fill="currentColor"
    />
  ),
  refresh: (
    <>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
      <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
    </>
  ),
};

export function Icon({
  name,
  size = 16,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}): ReactElement {
  return (
    <svg
      className={`icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
