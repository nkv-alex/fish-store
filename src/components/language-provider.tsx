"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  locales,
  translate,
  type Locale,
  type TranslationKey,
} from "@/lib/i18n";

const localeCookie = "fish-store-locale";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
}) {
  const [locale, setLocaleState] = useState(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale(nextLocale) {
        if (!locales.includes(nextLocale)) return;
        const secure = window.location.protocol === "https:" ? "; Secure" : "";
        document.cookie = `${localeCookie}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
        document.documentElement.lang = nextLocale;
        setLocaleState(nextLocale);
      },
      t: (key, values) => translate(locale, key, values),
    }),
    [locale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error("useLanguage must be used within a LanguageProvider.");
  }
  return value;
}
