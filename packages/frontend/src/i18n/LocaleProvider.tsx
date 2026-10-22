import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LocaleContext } from "./useLocale";
import { browserStorage, loadInitialLocale, writeStoredLocale } from "./locale";
import { LOCALE_TAGS } from "./translate";
import { ODIN_LANGS, odin } from "../odin/client";

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState(loadInitialLocale);

  // Idempotent, so a StrictMode double run is harmless. The Odin popups
  // follow too; the new language applies to the next popup opened.
  useEffect(() => {
    document.documentElement.lang = LOCALE_TAGS[locale];
    odin.lang = ODIN_LANGS[locale];
    writeStoredLocale(browserStorage(), locale);
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale }), [locale]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}
