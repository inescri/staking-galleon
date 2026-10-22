import type { ReactElement } from "react";
import { useLocale, useT } from "../i18n/useLocale";
import type { Locale } from "../i18n/translate";

/** Each language named in itself — the one place UI text is not a message key. */
const OPTIONS: readonly { locale: Locale; label: string }[] = [
  { locale: "en", label: "EN" },
  { locale: "zh", label: "中文" },
];

export function LanguageToggle(): ReactElement {
  const { locale, setLocale } = useLocale();
  const t = useT();

  return (
    <div
      className="language-toggle"
      role="group"
      aria-label={t("app.language")}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.locale}
          type="button"
          className="language-btn"
          lang={o.locale}
          aria-pressed={locale === o.locale}
          onClick={() => setLocale(o.locale)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
