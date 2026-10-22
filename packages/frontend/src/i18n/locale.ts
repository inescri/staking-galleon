import { LOCALES, type Locale } from "./translate";

/** The only localStorage key the app writes: a UI preference, never game state. */
export const LOCALE_STORAGE_KEY = "galleon.locale";

type LocaleStorage = Pick<Storage, "getItem" | "setItem">;

export function isLocale(value: unknown): value is Locale {
  return (LOCALES as readonly unknown[]).includes(value);
}

/** Any Chinese browser language → zh, everything else → en. */
export function detectLocale(language: string | undefined): Locale {
  return language !== undefined && /^zh\b/i.test(language) ? "zh" : "en";
}

/** A valid stored choice wins over the browser language. */
export function resolveInitialLocale(
  stored: string | null,
  language: string | undefined,
): Locale {
  return isLocale(stored) ? stored : detectLocale(language);
}

export function readStoredLocale(storage: LocaleStorage | null): string | null {
  if (storage === null) return null;
  try {
    return storage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeStoredLocale(
  storage: LocaleStorage | null,
  locale: Locale,
): void {
  if (storage === null) return;
  try {
    storage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Private mode or blocked storage: the choice just won't survive a reload.
  }
}

/** `window.localStorage`, or null where it is missing or access throws. */
export function browserStorage(): LocaleStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadInitialLocale(): Locale {
  const language =
    typeof navigator === "undefined" ? undefined : navigator.language;
  return resolveInitialLocale(readStoredLocale(browserStorage()), language);
}
