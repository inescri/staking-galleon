import { createContext, useCallback, useContext } from "react";
import { translate, type Locale, type TranslateFn } from "./translate";

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (ctx === null)
    throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

/** `t(key, params)` for the current locale. */
export function useT(): TranslateFn {
  const { locale } = useLocale();
  return useCallback((key, params) => translate(locale, key, params), [locale]);
}
