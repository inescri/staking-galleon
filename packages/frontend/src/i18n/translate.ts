import { en } from "./en";
import { zh } from "./zh";

export const LOCALES = ["en", "zh"] as const;
export type Locale = (typeof LOCALES)[number];

/** BCP 47 tags for `Intl` formatting and `<html lang>`. */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: "en-US",
  zh: "zh-CN",
};

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
export type Params = Record<string, string | number>;
export type TranslateFn = (key: MessageKey, params?: Params) => string;

/**
 * Text produced outside render (errors, status messages): a key resolved at
 * render time so it follows the locale, or raw text passed through as-is
 * (SDK and canister messages we have no translation for).
 */
export type UiText = { key: MessageKey; params?: Params } | { raw: string };

const MESSAGES: Record<Locale, Messages> = { en, zh };

/** Replace `{name}` tokens; an unknown token is left visible. */
export function interpolate(template: string, params?: Params): string {
  if (params === undefined) return template;
  return template.replace(/\{(\w+)\}/g, (token, name: string) =>
    name in params ? String(params[name]) : token,
  );
}

export function translate(
  locale: Locale,
  key: MessageKey,
  params?: Params,
): string {
  return interpolate(MESSAGES[locale][key], params);
}

export function resolveText(t: TranslateFn, text: UiText): string {
  return "raw" in text ? text.raw : t(text.key, text.params);
}
