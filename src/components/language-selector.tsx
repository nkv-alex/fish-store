"use client";

import { useLanguage } from "@/components/language-provider";
import { isLocale, type Locale } from "@/lib/i18n";

const languageNames: Record<Locale, string> = {
  es: "Español",
  en: "English",
  fr: "Français",
  de: "Deutsch",
};

export function LanguageSelector() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <label className="language-selector">
      <span className="visually-hidden">{t("language")}</span>
      <select
        aria-label={t("language")}
        value={locale}
        onChange={(event) => {
          const nextLocale = event.currentTarget.value;
          if (isLocale(nextLocale)) setLocale(nextLocale);
        }}
      >
        {(Object.entries(languageNames) as [Locale, string][]).map(([code, name]) => (
          <option key={code} value={code}>{name}</option>
        ))}
      </select>
    </label>
  );
}
