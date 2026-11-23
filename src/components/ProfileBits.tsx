"use client";
import { useLang } from "@/lib/i18n";
import { GOALS, INTERESTS, LEVELS, type Profile } from "@/lib/types";

export function useLabels() {
  const { lang } = useLang();
  const pick = (x: { ko: string; en: string }) => (lang === "ko" ? x.ko : x.en);
  return {
    interest: (k: string) => {
      const i = INTERESTS.find((x) => x.key === k);
      return i ? pick(i) : k;
    },
    goal: (p: Profile, k: string) => {
      const g = GOALS[p.role].find((x) => x.key === k);
      return g ? pick(g) : k;
    },
    level: (k: string) => {
      const l = LEVELS.find((x) => x.key === k);
      return l ? pick(l) : k;
    },
    role: (p: Profile) =>
      p.role === "korean" ? (lang === "ko" ? "한국 학생" : "Korean student") : lang === "ko" ? "유학생" : "International student",
  };
}

const TONES = ["bg-brand-600 text-white", "bg-brand-100 text-brand-700", "bg-brand-900 text-white", "bg-slate-200 text-slate-700"];

export function Avatar({ p, size = "md" }: { p: Profile; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "h-14 w-14 text-xl" : size === "sm" ? "h-8 w-8 text-xs" : "h-11 w-11 text-base";
  const tone = TONES[[...p.id].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];
  const initial = [...p.nickname.trim()][0]?.toUpperCase() ?? "?";
  return <span className={`grid shrink-0 place-items-center rounded-full font-semibold ${tone} ${cls}`}>{initial}</span>;
}

export function RoleBadge({ p }: { p: Profile }) {
  const l = useLabels();
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
        p.role === "korean" ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-700"
      }`}
    >
      {l.role(p)}
    </span>
  );
}
