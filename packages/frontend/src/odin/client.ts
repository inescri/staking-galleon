import { OdinConnect } from "odin-connect";

/**
 * Odin environments this app supports. Kept as a runtime array so the value
 * from `.env` can be validated; the `satisfies` clause makes the build fail if
 * the SDK's environment union ever changes.
 */
const ODIN_ENVS = [
  "prod",
  "staging",
  "dev",
  "local",
  "legacy",
] as const satisfies readonly OdinConnect["currentEnv"][];
export type OdinEnv = (typeof ODIN_ENVS)[number];

/**
 * Validate `VITE_ODIN_ENV`. A typo here would otherwise reach the SDK
 * unchecked and surface later as `new URL('undefined/...')` inside
 * `connect()`, so fail loudly at module load instead.
 */
export function parseOdinEnv(raw: string | undefined): OdinEnv {
  if (raw === undefined || raw === "") return "dev";
  if ((ODIN_ENVS as readonly string[]).includes(raw)) return raw as OdinEnv;
  throw new Error(
    `VITE_ODIN_ENV="${raw}" is not a valid Odin environment. ` +
      `Expected one of: ${ODIN_ENVS.join(", ")}`,
  );
}

const APP_NAME = import.meta.env.VITE_ODIN_APP_NAME ?? "Galleon Stakes";
const APP_ENV = parseOdinEnv(import.meta.env.VITE_ODIN_ENV);

/**
 * The one `OdinConnect` instance for this page load (odin-connect 2.x).
 *
 * Created at module level, not per render: the constructor immediately
 * restores the stored session and, when the page is coming back from an Odin
 * redirect (wallet in-app browsers), reads and verifies that result. Every
 * part of the app reads the outcome from this instance's state store — see
 * `useOdinState`.
 *
 * `mode` is left at the default `"auto"`: popups in normal browsers, a
 * full-page redirect inside wallet in-app browsers (OKX, Xverse, …).
 */
export const odin = new OdinConnect({ name: APP_NAME, env: APP_ENV });
