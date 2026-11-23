"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";
import { getFriends, hasSessionProfile, loadProfile } from "@/lib/profile";
import { INTERESTS, LEVELS, type Profile } from "@/lib/types";
import { Avatar, RoleBadge, useLabels } from "@/components/ProfileBits";

export default function MyProfile() {
  const tr = useT();
  const labels = useLabels();
  const router = useRouter();
  const [me, setMe] = useState<Profile | null>(null);
  const [friendCount, setFriendCount] = useState(0);

  useEffect(() => {
    if (!hasSessionProfile()) {
      router.replace("/onboard");
      return;
    }
    const p = loadProfile();
    setMe(p);
    setFriendCount(getFriends(p?.uid).length);
  }, [router]);

  if (!me) return null;

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <Avatar p={me} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-xl font-bold text-brand-900">{me.nickname}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-slate-600">
              <RoleBadge p={me} />
              <span>{me.country}</span>
              {me.major && <span className="text-slate-400">· {me.major}</span>}
            </div>
          </div>
        </div>
        {me.intro && <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700">“{me.intro}”</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link href="/onboard" className="btn-primary">
            {tr("프로필 수정", "Edit profile")}
          </Link>
          <Link href="/friends" className="btn-ghost">
            {tr("친구 관리", "Manage friends")} <span className="text-slate-400">{friendCount}</span>
          </Link>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-semibold">{tr("언어 실력", "Languages")}</h2>
        <dl className="mt-3 space-y-3">
          <LevelRow label={tr("한국어", "Korean")} level={me.koreanLevel} text={labels.level(me.koreanLevel)} />
          <LevelRow label={tr("영어", "English")} level={me.englishLevel} text={labels.level(me.englishLevel)} />
        </dl>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-semibold">{tr("관심사", "Interests")}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {me.interests.map((k) => (
            <span key={k} className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700">
              <span aria-hidden>{INTERESTS.find((i) => i.key === k)?.icon} </span>
              {labels.interest(k)}
            </span>
          ))}
        </div>
        <h2 className="mt-5 font-semibold">{tr("버디와 하고 싶은 것", "What I want from a buddy")}</h2>
        <ul className="mt-3 space-y-1.5">
          {me.goals.map((g) => (
            <li key={g} className="flex items-center gap-2 text-sm text-slate-700">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden />
              {labels.goal(me, g)}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function LevelRow({ label, level, text }: { label: string; level: string; text: string }) {
  const step = Math.max(0, LEVELS.findIndex((l) => l.key === level));
  return (
    <div className="flex items-center gap-3">
      <dt className="w-16 shrink-0 text-sm text-slate-600">{label}</dt>
      <dd className="flex flex-1 items-center gap-3">
        <span className="flex flex-1 gap-1" aria-hidden>
          {LEVELS.map((l, i) => (
            <span key={l.key} className={`h-2 flex-1 rounded-full ${i <= step && step > 0 ? "bg-brand-600" : "bg-slate-200"}`} />
          ))}
        </span>
        <span className="w-20 shrink-0 text-right text-sm font-semibold text-slate-800">{text}</span>
      </dd>
    </div>
  );
}
