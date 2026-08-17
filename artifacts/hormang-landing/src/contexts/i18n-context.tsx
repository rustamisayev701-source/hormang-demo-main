import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { dictionaries, type Locale, type Dict } from "@/lib/i18n";

const LOCALE_KEY = "hormang_locale";

interface I18nState {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Dict;
}

const I18nContext = createContext<I18nState | null>(null);

function readStoredLocale(): Locale {
  try {
    const raw = localStorage.getItem(LOCALE_KEY);
    if (raw === "uz" || raw === "ru" || raw === "en") return raw;
  } catch { /* noop */ }
  if (typeof navigator !== "undefined") {
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith("ru")) return "ru";
    if (lang.startsWith("en")) return "en";
  }
  return "uz";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale());

  useEffect(() => {
    try { localStorage.setItem(LOCALE_KEY, locale); } catch { /* noop */ }
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: dictionaries[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nState {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
