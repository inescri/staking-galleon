import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { LocaleContext } from "./useLocale";
import { browserStorage, writeStoredLocale } from "./locale";
import { LOCALE_TAGS, translate, type Locale } from "./translate";
import { ODIN_LANGS, initialLocale, odin } from "../odin/client";

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState(initialLocale);

  // Only an explicit choice is stored; a detected browser language is not,
  // so detection keeps following the browser until the user picks one.
  const setLocale = useCallback((next: Locale) => {
    writeStoredLocale(browserStorage(), next);
    setLocaleState(next);
  }, []);

  // A layout effect, so <html lang> and the tab title match the locale before
  // the first paint (index.html ships lang="en"). Idempotent, so a StrictMode
  // double run is harmless. The Odin popups follow too; the new language
  // applies to the next popup opened.
  useLayoutEffect(() => {
    document.documentElement.lang = LOCALE_TAGS[locale];
    document.title = translate(locale, "app.documentTitle");
    odin.lang = ODIN_LANGS[locale];
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}
