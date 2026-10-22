import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LocaleContext } from "./useLocale";
import { browserStorage, loadInitialLocale, writeStoredLocale } from "./locale";
import { LOCALE_TAGS } from "./translate";

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState(loadInitialLocale);

  // Idempotent, so a StrictMode double run is harmless.
  useEffect(() => {
    document.documentElement.lang = LOCALE_TAGS[locale];
    writeStoredLocale(browserStorage(), locale);
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale }), [locale]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}
