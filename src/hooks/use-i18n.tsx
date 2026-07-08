import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import en from "@/i18n/en.json";
import sw from "@/i18n/sw.json";

// Register languages here to add more (e.g. fr, ar) — no code changes elsewhere needed.
const RESOURCES = { en, sw } as const;

export type Lang = keyof typeof RESOURCES;
export const DEFAULT_LANG: Lang = "en";
export const AVAILABLE_LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "sw", flag: "🇹🇿", label: "Kiswahili" },
];

const STORAGE_KEY = "spaces.lang";

type Dict = Record<string, unknown>;

function lookup(dict: Dict, path: string): string | undefined {
  const parts = path.split(".");
  let node: unknown = dict;
  for (const p of parts) {
    if (node && typeof node === "object" && p in (node as Dict)) {
      node = (node as Dict)[p];
    } else {
      return undefined;
    }
  }
  return typeof node === "string" ? node : undefined;
}

function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  chosen: boolean;
}

const Ctx = createContext<I18nCtx | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);
  const [chosen, setChosen] = useState(true); // avoid SSR flash; corrected in effect

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && saved in RESOURCES) {
        setLangState(saved as Lang);
        setChosen(true);
      } else {
        setChosen(false);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    setChosen(true);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const primary = lookup(RESOURCES[lang] as Dict, key);
      if (primary !== undefined) return interpolate(primary, vars);
      // Fallback to English
      const fallback = lookup(RESOURCES[DEFAULT_LANG] as Dict, key);
      if (fallback !== undefined) return interpolate(fallback, vars);
      // Last resort: return the key itself, never blank
      if (typeof console !== "undefined" && process.env.NODE_ENV !== "production") {
        console.warn(`[i18n] Missing translation: ${key}`);
      }
      return key;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t, chosen }), [lang, setLang, t, chosen]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
