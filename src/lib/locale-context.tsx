import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getTranslations } from "./i18n";

export type Locale = "en" | "fr" | "es" | "fa" | "ar";

interface LocaleConfig {
  code: Locale;
  label: string;
  dir: "ltr" | "rtl";
}

export const LOCALES: LocaleConfig[] = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "fr", label: "Français", dir: "ltr" },
  { code: "es", label: "Español", dir: "ltr" },
  { code: "fa", label: "فارسی", dir: "rtl" },
  { code: "ar", label: "العربية", dir: "rtl" },
];

interface LocaleCtx {
  locale: Locale;
  dir: "ltr" | "rtl";
  setLocale: (l: Locale) => void;
  t: (key: string, fallback?: string) => string;
}

const LocaleContext = createContext<LocaleCtx | null>(null);
const STORAGE_KEY = "clinicpro:locale";

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return "en";
    const saved = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    return saved && LOCALES.some((l) => l.code === saved) ? saved : "en";
  });

  const dir = useMemo(() => LOCALES.find((l) => l.code === locale)?.dir ?? "ltr", [locale]);
  const t = useMemo(() => getTranslations(locale), [locale]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.setAttribute("lang", locale);
    root.setAttribute("dir", dir);
  }, [locale, dir]);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, next);
  };

  return <LocaleContext.Provider value={{ locale, dir, setLocale, t }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
