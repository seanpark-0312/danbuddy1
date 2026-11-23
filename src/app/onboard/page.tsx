"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pickLabel, useLang, useT, type Lang } from "@/lib/i18n";
import { getSessionId, hasSessionProfile, loadProfile, saveProfile } from "@/lib/profile";
import { AVATARS, GOALS, INTERESTS, LEVELS, type Level, type Profile, type Role } from "@/lib/types";

const EMPTY: Omit<Profile, "id"> = {
  nickname: "",
  avatar: AVATARS[0],
  role: "korean",
  country: "대한민국 Korea",
  major: "",
  koreanLevel: "native",
  englishLevel: "basic",
  interests: [],
  goals: [],
  intro: "",
};

export default function Onboard() {
  const tr = useT();
  const { lang } = useLang();
  const router = useRouter();
  const [p, setP] = useState<Omit<Profile, "id">>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    const saved = loadProfile();
    if (saved) setP(saved);
    setEditing(hasSessionProfile());
    setLoaded(true);
  }, []);

  const set = <K extends keyof typeof p>(k: K, v: (typeof p)[K]) => setP((prev) => ({ ...prev, [k]: v }));
  const toggle = (k: "interests" | "goals", v: string) =>
    setP((prev) => ({ ...prev, [k]: prev[k].includes(v) ? prev[k].filter((x) => x !== v) : [...prev[k], v] }));

  function chooseRole(role: Role) {
    setP((prev) => ({
      ...prev,
      role,
      goals: [],
      country: role === "korean" ? "대한민국 Korea" : prev.country === "대한민국 Korea" ? "" : prev.country,
      koreanLevel: role === "korean" ? "native" : prev.koreanLevel === "native" ? "basic" : prev.koreanLevel,
      englishLevel: role === "korean" ? (prev.englishLevel === "native" ? "basic" : prev.englishLevel) : prev.englishLevel,
    }));
  }

  const valid = p.nickname.trim() && p.country.trim() && p.interests.length > 0 && p.goals.length > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      setTried(true);
      return;
    }
    saveProfile({ ...p, nickname: p.nickname.trim(), id: getSessionId() });
    router.push("/lobby");
  }

  if (!loaded) return null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-brand-900">{editing ? tr("프로필 수정", "Edit profile") : tr("버디 프로필 만들기", "Create your buddy profile")}</h1>
      <p className="mt-1 text-sm text-slate-600">
        {tr(
          "AI가 이 정보로 잘 맞는 버디를 찾아요. 프로필은 이 브라우저에만 저장돼요.",
          "AI uses this to find a good buddy for you. Your profile is stored only in this browser.",
        )}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-6">
        <section className="card p-5">
          <h2 className="font-semibold">{tr("나는…", "I am…")}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(
              [
                ["korean", "KOREAN", tr("한국 학생", "Korean student"), tr("외국인 친구·영어 회화를 원해요", "Want international friends & English practice")],
                ["international", "INTERNATIONAL", tr("외국인 유학생", "International student"), tr("한국 생활·학교 적응 도움이 필요해요", "Need help with life in Korea & campus")],
              ] as const
            ).map(([role, icon, title, desc]) => (
              <button
                type="button"
                key={role}
                aria-pressed={p.role === role}
                onClick={() => chooseRole(role)}
                className={`rounded-2xl border-2 p-4 text-left transition ${
                  p.role === role ? "border-brand-600 bg-brand-50" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="text-xs font-semibold tracking-wide text-brand-600">{icon}</div>
                <div className="mt-1 font-bold">{title}</div>
                <div className="text-sm text-slate-600">{desc}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm font-medium">{tr("닉네임", "Nickname")} *</span>
            <input className="input" name="nickname" autoComplete="nickname" spellCheck={false} value={p.nickname} maxLength={20} onChange={(e) => set("nickname", e.target.value)} placeholder={tr("예: 민준", "e.g. Emma")} />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium">{tr("국가", "Country")} *</span>
            <input className="input" name="country" autoComplete="country-name" value={p.country} maxLength={40} onChange={(e) => set("country", e.target.value)} placeholder={tr("예: 베트남", "e.g. Vietnam")} />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium">{tr("전공 (선택)", "Major (optional)")}</span>
            <input className="input" name="major" autoComplete="off" value={p.major} maxLength={40} onChange={(e) => set("major", e.target.value)} placeholder={tr("예: 경영학과", "e.g. Business")} />
          </label>
          <LevelSelect label={tr("한국어 수준", "Korean level")} value={p.koreanLevel} onChange={(v) => set("koreanLevel", v)} lang={lang} />
          <LevelSelect label={tr("영어 수준", "English level")} value={p.englishLevel} onChange={(v) => set("englishLevel", v)} lang={lang} />
        </section>

        <section className="card p-5">
          <h2 className="font-semibold">
            {p.role === "korean" ? tr("버디에게 기대하는 것", "What I want from a buddy") : tr("도움이 필요한 것", "What I need help with")} *
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {GOALS[p.role].map((g) => (
              <button
                type="button"
                key={g.key}
                aria-pressed={p.goals.includes(g.key)}
                onClick={() => toggle("goals", g.key)}
                className={`chip ${p.goals.includes(g.key) ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white text-slate-700"}`}
              >
                {pickLabel(g, lang)}
              </button>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold">{tr("관심사 (여러 개 선택)", "Interests (pick several)")} *</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {INTERESTS.map((i) => (
              <button
                type="button"
                key={i.key}
                aria-pressed={p.interests.includes(i.key)}
                onClick={() => toggle("interests", i.key)}
                className={`chip ${p.interests.includes(i.key) ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-300 bg-white text-slate-700"}`}
              >
                {pickLabel(i, lang)}
              </button>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <label className="space-y-1.5">
            <span className="font-semibold">{tr("한 줄 소개 (선택)", "Short intro (optional)")}</span>
            <textarea
              name="intro"
              autoComplete="off"
              className="input min-h-20"
              value={p.intro}
              maxLength={200}
              onChange={(e) => set("intro", e.target.value)}
              placeholder={tr("예: 주말마다 카페 탐방해요. 영어로 수다 떨 친구 구해요!", "e.g. I just arrived in Korea and want to try Korean BBQ with friends!")}
            />
          </label>
        </section>

        <div className="flex items-center justify-between gap-3">
          {tried && !valid ? (
            <p role="alert" className="text-sm text-red-600">
              {tr("빠진 필수 항목이 있어요: ", "Still missing: ")}
              {[
                !p.nickname.trim() && tr("닉네임", "Nickname"),
                !p.country.trim() && tr("국가", "Country"),
                !p.goals.length && (p.role === "korean" ? tr("버디에게 기대하는 것", "What I want from a buddy") : tr("도움이 필요한 것", "What I need help with")),
                !p.interests.length && tr("관심사", "Interests"),
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
          ) : (
            <p className="text-xs text-slate-500">* {tr("필수 항목", "Required")}</p>
          )}
          <button className="btn-primary px-8 py-3 text-base">
            {tr("저장하고 버디 찾기", "Save & find a buddy")} →
          </button>
        </div>
      </form>
    </main>
  );
}

function LevelSelect({ label, value, onChange, lang }: { label: string; value: Level; onChange: (v: Level) => void; lang: Lang }) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value as Level)}>
        {LEVELS.map((l) => (
          <option key={l.key} value={l.key}>
            {pickLabel(l, lang)}
          </option>
        ))}
      </select>
    </label>
  );
}
