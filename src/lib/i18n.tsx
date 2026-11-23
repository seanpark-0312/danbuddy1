"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { EXTRA } from "./strings";
import { MORE } from "./strings-more";

export type Lang = "ko" | "en" | "ja" | "zh" | "es" | "fr" | "de" | "ru" | "kk";

const MORE_ORDER = ["es", "fr", "de", "ru", "kk"] as const;

/** Translation of an English UI string into a non-Korean, non-English language. */
function lookup(en: string, lang: Lang): string | undefined {
  if (lang === "ja" || lang === "zh") return EXTRA[en]?.[lang];
  const i = MORE_ORDER.indexOf(lang as (typeof MORE_ORDER)[number]);
  return i >= 0 ? MORE[en]?.[i] : undefined;
}

export const LANGS: { key: Lang; label: string; locale: string }[] = [
  { key: "ko", label: "한국어", locale: "ko-KR" },
  { key: "en", label: "English", locale: "en-US" },
  { key: "ja", label: "日本語", locale: "ja-JP" },
  { key: "zh", label: "中文", locale: "zh-CN" },
  { key: "es", label: "Español", locale: "es-ES" },
  { key: "fr", label: "Français", locale: "fr-FR" },
  { key: "de", label: "Deutsch", locale: "de-DE" },
  { key: "ru", label: "Русский", locale: "ru-RU" },
  { key: "kk", label: "Қазақша", locale: "kk-KZ" },
];

const isLang = (v: unknown): v is Lang => LANGS.some((l) => l.key === v);

/** Pick the label for the current language from a {ko, en, ja?, zh?} record. */
export function pickLabel(x: { ko: string; en: string; ja?: string; zh?: string }, lang: Lang) {
  if (lang === "ko" || lang === "en") return x[lang];
  return (lang === "ja" || lang === "zh" ? x[lang] : undefined) ?? lookup(x.en, lang) ?? x.en;
}

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "ko",
  setLang: () => {},
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ko");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("lang");
      const nav = navigator.language.slice(0, 2);
      if (isLang(saved)) setLangState(saved);
      else if (isLang(nav)) setLangState(nav);
      else setLangState("en");
    } catch {}
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("lang", l);
    } catch {}
  };
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
}

export function useLang() {
  return useContext(LangCtx);
}

/**
 * tr("한국어", "English", vars?) picks the string for the current UI language.
 * Other languages come from the EXTRA / MORE tables keyed by the English text.
 * "{name}" placeholders are filled from vars.
 */
export function useT() {
  const { lang } = useLang();
  return (ko: string, en: string, vars?: Record<string, string | number>) => {
    let s = lang === "ko" ? ko : lang === "en" ? en : (lookup(en, lang) ?? en);
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value as Lang)}
      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
      aria-label="Language"
    >
      {LANGS.map((l) => (
        <option key={l.key} value={l.key}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
