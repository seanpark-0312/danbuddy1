"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { EXTRA } from "./strings";

export type Lang = "ko" | "en" | "ja" | "zh";

export const LANGS: { key: Lang; label: string; locale: string }[] = [
  { key: "ko", label: "한국어", locale: "ko-KR" },
  { key: "en", label: "English", locale: "en-US" },
  { key: "ja", label: "日本語", locale: "ja-JP" },
  { key: "zh", label: "中文", locale: "zh-CN" },
];

const isLang = (v: unknown): v is Lang => LANGS.some((l) => l.key === v);

/** Pick the label for the current language from a {ko, en, ja?, zh?} record. */
export function pickLabel(x: { ko: string; en: string; ja?: string; zh?: string }, lang: Lang) {
  return x[lang] ?? x.en;
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
 * Japanese and Chinese come from the EXTRA table keyed by the English text.
 * "{name}" placeholders are filled from vars.
 */
export function useT() {
  const { lang } = useLang();
  return (ko: string, en: string, vars?: Record<string, string | number>) => {
    let s = lang === "ko" ? ko : lang === "en" ? en : (EXTRA[en]?.[lang] ?? en);
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
