"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LANGS, useLang, useT } from "@/lib/i18n";
import { getFriends, hasSessionProfile, loadProfile, removeFriend } from "@/lib/profile";
import { openChannel } from "@/lib/realtime";
import { buddyById } from "@/lib/aiBuddies";
import type { Friend, Profile } from "@/lib/types";
import { Avatar, RoleBadge, useLabels } from "@/components/ProfileBits";

interface Presence {
  profile: Profile;
  status: "idle" | "searching" | "busy";
}

export default function Friends() {
  const tr = useT();
  const { lang } = useLang();
  const labels = useLabels();
  const router = useRouter();
  const [me, setMe] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [online, setOnline] = useState<Presence[]>([]);
  const [query, setQuery] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSessionProfile()) {
      router.replace("/onboard");
      return;
    }
    const p = loadProfile();
    setMe(p);
    setFriends(getFriends(p?.uid));
  }, [router]);

  // watch who is in the lobby without showing up there ourselves
  useEffect(() => {
    if (!me) return;
    const c = openChannel("lobby", `watch-${me.id}`);
    c.onPresence((list: Presence[]) => setOnline(list.filter((x) => x?.profile && x.profile.id !== me.id)));
    c.subscribe();
    return () => c.close();
  }, [me]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? friends.filter((f) => f.profile.nickname.toLowerCase().includes(q) || f.profile.country.toLowerCase().includes(q)) : friends;
  }, [friends, query]);

  if (!me) return null;
  const locale = LANGS.find((l) => l.key === lang)?.locale;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-900">
            {tr("친구 관리", "Manage friends")} <span className="text-base font-medium text-slate-400">{friends.length}</span>
          </h1>
          <p className="text-sm text-slate-500">{tr("친구 목록은 이 브라우저에만 저장돼요.", "Your friend list is stored only in this browser.")}</p>
        </div>
        {friends.length > 0 && (
          <input
            className="input w-full sm:w-60"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr("이름·국적으로 찾기", "Search by name or country")}
            aria-label={tr("이름·국적으로 찾기", "Search by name or country")}
          />
        )}
      </div>

      {friends.length === 0 ? (
        <div className="card mt-5 grid place-items-center p-10 text-center">
          <p className="font-medium">{tr("아직 친구가 없어요", "No friends yet")}</p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            {tr("대화방에서 '친구 추가'를 누르면 여기에 모여요.", "Tap Add friend in a chat and they show up here.")}
          </p>
          <Link href="/lobby" className="btn-primary mt-4">
            {tr("버디 찾기", "Find a buddy")}
          </Link>
        </div>
      ) : (
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {shown.map((f) => {
            const live = f.ai ? undefined : online.find((o) => o.profile.uid === f.uid);
            const p = live?.profile ?? f.profile;
            const busy = live?.status === "busy";
            return (
              <li key={f.uid} className="card flex flex-col p-4">
                <div className="flex items-start gap-3">
                  <Avatar p={p} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="break-words font-semibold">{p.nickname}</p>
                      <RoleBadge p={p} />
                    </div>
                    <p className="text-xs text-slate-500">
                      {p.country}
                      {p.major ? ` · ${p.major}` : ""}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                      <span className={`h-1.5 w-1.5 rounded-full ${f.ai || (live && !busy) ? "bg-emerald-500" : "bg-slate-300"}`} />
                      {f.ai ? tr("AI · 언제든 대화 가능", "AI · always available") : live ? (busy ? tr("대화 중", "Busy") : tr("접속 중", "Online")) : tr("오프라인", "Offline")}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  KO {labels.level(p.koreanLevel)} · EN {labels.level(p.englishLevel)}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.interests.map((i) => (
                    <span key={i} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                      {labels.interest(i)}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-slate-400">
                  {tr("{date}에 친구가 됐어요", "Friends since {date}", {
                    date: new Date(f.since).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" }),
                  })}
                </p>
                <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                  {removing === f.uid ? (
                    <>
                      <span className="flex-1 text-sm text-slate-600">{tr("친구에서 삭제할까요?", "Remove from friends?")}</span>
                      <button className="btn-ghost px-3 py-1.5" onClick={() => setRemoving(null)}>
                        {tr("취소", "Cancel")}
                      </button>
                      <button
                        className="btn bg-red-600 px-3 py-1.5 text-white hover:bg-red-700"
                        onClick={() => {
                          removeFriend(me.uid, f.uid);
                          setFriends(getFriends(me.uid));
                          setRemoving(null);
                        }}
                      >
                        {tr("삭제", "Remove")}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn-primary flex-1 py-1.5"
                        disabled={!f.ai && (!live || busy)}
                        onClick={() =>
                          f.ai
                            ? router.push(`/chat/ai-${buddyById(f.uid)?.key ?? "emma"}-${crypto.randomUUID().slice(0, 8)}`)
                            : router.push(`/lobby?invite=${encodeURIComponent(f.uid)}`)
                        }
                      >
                        {f.ai ? tr("대화하기", "Chat") : live ? tr("대화 신청", "Say hi") : tr("오프라인", "Offline")}
                      </button>
                      <button className="btn-ghost px-3 py-1.5 text-slate-500" onClick={() => setRemoving(f.uid)}>
                        {tr("삭제", "Remove")}
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
          {shown.length === 0 && <li className="text-sm text-slate-500">{tr("찾는 친구가 없어요.", "No friends match.")}</li>}
        </ul>
      )}
    </main>
  );
}
