import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { LocaleContext } from "./useLocale";
import { browserStorage, loadInitialLocale, writeStoredLocale } from "./locale";
import { LOCALE_TAGS, type Locale } from "./translate";
import { ODIN_LANGS, odin } from "../odin/client";

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState(loadInitialLocale);

  // Only an explicit choice is stored; a detected browser language is not,
  // so detection keeps following the browser until the user picks one.
  const setLocale = useCallback((next: Locale) => {
    writeStoredLocale(browserStorage(), next);
    setLocaleState(next);
  }, []);

  // Idempotent, so a StrictMode double run is harmless. The Odin popups
  // follow too; the new language applies to the next popup opened.
  useEffect(() => {
    document.documentElement.lang = LOCALE_TAGS[locale];
    odin.lang = ODIN_LANGS[locale];
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}
