"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLang, useT } from "@/lib/i18n";
import { getBlocked, getFriends, hasSessionProfile, loadProfile, removeFriend, setPartner } from "@/lib/profile";
import { isDemoMode, openChannel, type RTChannel } from "@/lib/realtime";
import { matchScore, sharedInterests } from "@/lib/matching";
import type { Friend, Profile } from "@/lib/types";
import { Avatar, RoleBadge, useLabels } from "@/components/ProfileBits";
import Crew from "@/components/Crew";
import { AI_BUDDIES, INTERNATIONAL_BUDDIES, buddyById, type BuddyKey } from "@/lib/aiBuddies";

type Status = "idle" | "searching" | "busy";
interface Presence {
  profile: Profile;
  status: Status;
}
interface Invite {
  from: Profile;
  to: string;
  roomId: string;
  mode: "direct" | "random";
}
interface AiPick {
  score: number;
  reason: string;
  icebreaker: string;
}

export default function Lobby() {
  const tr = useT();
  const { lang } = useLang();
  const labels = useLabels();
  const router = useRouter();
  const [me, setMe] = useState<Profile | null>(null);
  const [others, setOthers] = useState<Presence[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [incoming, setIncoming] = useState<Invite | null>(null);
  const [pendingTo, setPendingTo] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [ai, setAi] = useState<Record<string, AiPick>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOff, setAiOff] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);
  const ch = useRef<RTChannel | null>(null);
  const stateRef = useRef({ status, pendingTo, incoming });
  stateRef.current = { status, pendingTo, incoming };

  useEffect(() => {
    if (!hasSessionProfile()) {
      router.replace("/onboard");
      return;
    }
    const p = loadProfile();
    setMe(p);
    setFriends(getFriends(p?.uid));
  }, [router]);

  const go = useCallback(
    (roomId: string, partner: Profile) => {
      setPartner(roomId, partner);
      router.push(`/chat/${roomId}`);
    },
    [router],
  );

  // connect to lobby
  useEffect(() => {
    if (!me) return;
    const c = openChannel("lobby", me.id);
    ch.current = c;
    c.onPresence((list: Presence[]) => {
      const blocked = getBlocked();
      setOthers(list.filter((p) => p?.profile && p.profile.id !== me.id && !blocked.includes(p.profile.id)));
    });
    c.on("invite", (inv: Invite) => {
      if (inv.to !== me.id || getBlocked().includes(inv.from.id)) return;
      const s = stateRef.current;
      if (inv.mode === "random") {
        if (s.status === "searching" && !s.pendingTo) {
          c.send("invite-accept", { to: inv.from.id, from: me, roomId: inv.roomId });
          go(inv.roomId, inv.from);
        } else c.send("invite-decline", { to: inv.from.id, roomId: inv.roomId });
        return;
      }
      if (s.incoming || s.pendingTo) c.send("invite-decline", { to: inv.from.id, roomId: inv.roomId });
      else setIncoming(inv);
    });
    c.on("invite-accept", (m: { to: string; from: Profile; roomId: string }) => {
      if (m.to !== me.id) return;
      go(m.roomId, m.from);
    });
    c.on("invite-decline", (m: { to: string }) => {
      if (m.to !== me.id) return;
      setPendingTo(null);
      if (stateRef.current.status !== "searching") setToast(tr("상대가 지금은 대화할 수 없대요.", "They can't chat right now."));
    });
    c.on("invite-cancel", (m: { to: string }) => {
      if (m.to === me.id) setIncoming(null);
    });
    c.subscribe();
    c.track({ profile: me, status: "idle" });
    return () => c.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, go]);

  useEffect(() => {
    if (me) ch.current?.track({ profile: me, status: incoming || pendingTo ? "busy" : status });
  }, [me, status, incoming, pendingTo]);

  // "Say hi" on the friends page comes here as /lobby?invite=<uid>; send it once they show up online
  const inviteUid = useRef<string | null>(null);
  useEffect(() => {
    inviteUid.current = new URLSearchParams(window.location.search).get("invite");
  }, []);
  useEffect(() => {
    const uid = inviteUid.current;
    if (!uid || !me || pendingTo) return;
    const o = others.find((x) => x.profile.uid === uid);
    if (!o || o.status === "busy") return;
    inviteUid.current = null;
    window.history.replaceState(null, "", "/lobby");
    requestChat(o.profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [others, me, pendingTo]);

  const ranked = useMemo(() => {
    if (!me) return [];
    return others
      .map((o) => ({ ...o, score: ai[o.profile.id]?.score ?? matchScore(me, o.profile) }))
      .sort((a, b) => b.score - a.score);
  }, [others, me, ai]);

  // random matching: the searcher with the smaller id sends the invite
  useEffect(() => {
    if (!me || status !== "searching" || pendingTo) return;
    const candidates = ranked.filter((o) => o.status === "searching");
    const preferred = candidates.filter((o) => o.profile.role !== me.role);
    const target = (preferred.length ? preferred : candidates)[0];
    if (!target || me.id > target.profile.id) return;
    const roomId = crypto.randomUUID().slice(0, 12);
    setPendingTo(target.profile.id);
    ch.current?.send("invite", { from: me, to: target.profile.id, roomId, mode: "random" } satisfies Invite);
    const t = setTimeout(() => setPendingTo(null), 4000);
    return () => clearTimeout(t);
  }, [ranked, status, pendingTo, me]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function requestChat(target: Profile) {
    if (!me) return;
    const roomId = crypto.randomUUID().slice(0, 12);
    setPendingTo(target.id);
    ch.current?.send("invite", { from: me, to: target.id, roomId, mode: "direct" } satisfies Invite);
  }
  function cancelRequest() {
    if (pendingTo) ch.current?.send("invite-cancel", { to: pendingTo });
    setPendingTo(null);
  }
  function answer(accept: boolean) {
    if (!incoming || !me) return;
    if (accept) {
      ch.current?.send("invite-accept", { to: incoming.from.id, from: me, roomId: incoming.roomId });
      go(incoming.roomId, incoming.from);
    } else {
      ch.current?.send("invite-decline", { to: incoming.from.id, roomId: incoming.roomId });
      setIncoming(null);
    }
  }

  async function askAi() {
    if (!me || !others.length) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/match", {
        method: "POST",
        body: JSON.stringify({ me, candidates: ranked.map((r) => r.profile), lang }),
      });
      const data = await res.json();
      if (!data.ai) setAiOff(true);
      const map: Record<string, AiPick> = {};
      for (const r of data.results ?? []) map[r.id] = r;
      setAi(map);
    } finally {
      setAiLoading(false);
    }
  }

  function chatWithFriend(f: Friend, online?: Presence) {
    if (f.ai) router.push(`/chat/ai-${buddyById(f.uid)?.key ?? "emma"}-${crypto.randomUUID().slice(0, 8)}`);
    else if (online) requestChat(online.profile);
  }

  if (!me) return null;
  // all AI buddies are always available; the ones that fit my role come first
  const aiOrder: BuddyKey[] = me.role === "korean" ? INTERNATIONAL_BUDDIES : ["minjun", ...INTERNATIONAL_BUDDIES];
  const openAi = (k: BuddyKey) => router.push(`/chat/ai-${k}-${crypto.randomUUID().slice(0, 8)}`);
  const friendUids = new Set(friends.map((f) => f.uid));
  const pendingProfile = others.find((o) => o.profile.id === pendingTo)?.profile;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      {isDemoMode() && (
        <p className="mb-4 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-xs text-brand-700">
          {tr(
            "데모 모드: 같은 브라우저의 다른 창·탭끼리 연결돼요. 실시간 서버를 연결하면 다른 기기끼리도 매칭됩니다.",
            "Demo mode: windows and tabs of this browser connect to each other. Connect the realtime server to match across devices.",
          )}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-3.5">
              <Avatar p={me} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="break-words text-[21px] font-bold leading-tight">{me.nickname}</p>
                <p className="mt-0.5 text-[13.5px] text-slate-500">
                  {labels.role(me)} · {me.country}
                </p>
              </div>
              <Link href="/profile" className="shrink-0 rounded-full border border-[#d5dde8] px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
                {tr("프로필 수정", "Edit profile")}
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {me.goals.map((g) => (
                <span key={g} className="rounded-full bg-[#eaf1fb] px-3 py-1.5 text-[12.5px] font-semibold text-brand-600">
                  {labels.goal(me, g)}
                </span>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-3.5">
              <QuestionOrb />
              <div className="min-w-0">
                <h2 className="text-[17px] font-bold">{tr("랜덤 매칭", "Random match")}</h2>
                <p className="mt-0.5 text-[13.5px] leading-snug text-slate-500">
                  {tr(
                    "지금 대기 중인 사람 중 가장 잘 맞는 상대와 바로 연결해요. 한국 학생은 유학생과, 유학생은 한국 학생과 우선 연결돼요.",
                    "Connect right away with the best-fitting person who is also waiting. Korean and international students are paired first.",
                  )}
                </p>
              </div>
            </div>
            {status === "searching" ? (
              <button className="btn-ghost mt-4 h-[52px] w-full rounded-[15px] text-base" onClick={() => setStatus("idle")}>
                <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
                {tr("상대를 찾는 중… (취소)", "Searching… (cancel)")}
              </button>
            ) : (
              <button
                className="btn-primary mt-4 h-[52px] w-full rounded-[15px] text-base shadow-[0_8px_20px_rgba(0,72,155,0.22)]"
                onClick={() => setStatus("searching")}
                disabled={!!pendingTo}
              >
                {tr("랜덤 매칭 시작", "Start random match")}
              </button>
            )}
          </div>


          <div className="card space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                {tr("내 친구", "My friends")} {friends.length > 0 && <span className="text-sm font-medium text-slate-400">{friends.length}</span>}
              </h2>
              {friends.length > 0 && (
                <Link href="/friends" className="text-xs font-semibold text-brand-600 hover:underline">
                  {tr("친구 관리", "Manage")}
                </Link>
              )}
            </div>
            {friends.length === 0 ? (
              <p className="text-sm text-slate-600">
                {tr("대화방에서 '친구 추가'를 누르면 여기에 모여요. 접속해 있으면 바로 다시 대화를 신청할 수 있어요.", "Tap Add friend in a chat and they show up here. When they're online, you can say hi again right away.")}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {friends.map((f) => {
                  const online = f.ai ? undefined : others.find((o) => o.profile.uid === f.uid);
                  const busy = online?.status === "busy";
                  return (
                    <li key={f.uid} className="flex items-center gap-3 py-2.5">
                      <Avatar p={online?.profile ?? f.profile} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{(online?.profile ?? f.profile).nickname}</p>
                        <p className="flex items-center gap-1.5 text-xs text-slate-500">
                          <span className={`h-1.5 w-1.5 rounded-full ${f.ai || (online && !busy) ? "bg-emerald-500" : "bg-slate-300"}`} />
                          {f.ai ? tr("AI · 언제든 대화 가능", "AI · always available") : online ? (busy ? tr("대화 중", "Busy") : tr("접속 중", "Online")) : tr("오프라인", "Offline")}
                        </p>
                      </div>
                      {removing === f.uid ? (
                        <span className="flex gap-1">
                          <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setRemoving(null)}>
                            {tr("취소", "Cancel")}
                          </button>
                          <button
                            className="btn bg-red-600 px-2 py-1 text-xs text-white"
                            onClick={() => {
                              removeFriend(me.uid, f.uid);
                              setFriends(getFriends(me.uid));
                              setRemoving(null);
                            }}
                          >
                            {tr("삭제", "Remove")}
                          </button>
                        </span>
                      ) : (
                        <>
                          <button
                            className="btn-primary px-3 py-1.5 text-xs"
                            disabled={!f.ai && (!online || busy || !!pendingTo)}
                            onClick={() => chatWithFriend(f, online)}
                          >
                            {f.ai ? tr("대화하기", "Chat") : tr("대화 신청", "Say hi")}
                          </button>
                          <button
                            className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            aria-label={tr("{name} 친구 삭제", "Remove {name}", { name: f.profile.nickname })}
                            onClick={() => setRemoving(f.uid)}
                          >
                            ×
                          </button>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>


        </aside>

        <section className="min-w-0 space-y-6">
          <div>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1">
              <h2 className="text-[19px] font-bold">{tr("AI 연습 버디", "AI practice buddy")}</h2>
              <p className="text-[13.5px] text-slate-500">
                {tr("접속한 사람이 없을 때, AI 버디와 먼저 대화를 연습해 보세요.", "No one online? Warm up by chatting with an AI buddy first.")}
              </p>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2 sm:gap-3.5 xl:grid-cols-3">
              {aiOrder.map((k) => {
                const b = AI_BUDDIES[k];
                return (
                  <li key={k} className="card flex items-center gap-3 rounded-[18px] p-3 sm:flex-col sm:items-stretch sm:rounded-[22px] sm:p-[18px]">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-[#f1f5fb] text-2xl sm:h-12 sm:w-12 sm:rounded-[15px]" aria-hidden>
                        {b.flag}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-[15.5px] font-semibold">
                          {b.name}
                          {friendUids.has(b.profile.id) && (
                            <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-600">{tr("친구", "Friend")}</span>
                          )}
                        </span>
                        <span className="block truncate text-[13px] text-slate-500">
                          {b.profile.country} · {b.profile.major}
                        </span>
                      </span>
                    </div>
                    <p className="hidden text-[13.5px] leading-normal text-slate-600 sm:line-clamp-2 sm:block">{b.profile.intro}</p>
                    <button
                      className="shrink-0 rounded-xl bg-[#eaf1fb] px-3 py-2 text-[13.5px] font-semibold text-brand-600 transition hover:bg-brand-100 sm:mt-auto sm:py-2.5"
                      onClick={() => openAi(k)}
                    >
                      {tr("대화하기", "Chat")}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
            <div>
              <h1 className="text-[19px] font-bold">{tr("지금 접속 중인 버디", "Buddies online now")}</h1>
              <p className="text-sm text-slate-500">
                {others.length
                  ? tr("{n}명 · 잘 맞는 순서로 정렬했어요", "{n} online · sorted by fit", { n: others.length })
                  : tr("아직 접속한 사람이 없어요", "No one is online yet")}
              </p>
            </div>
            <button className="btn-ghost" onClick={askAi} disabled={aiLoading || !others.length}>
              {aiLoading ? tr("AI가 분석 중…", "AI is thinking…") : tr("✦ AI 추천 이유 보기", "✦ Ask AI why we fit")}
            </button>
          </div>
          {aiOff && (
            <p className="mb-3 text-xs text-slate-500">
              {tr("AI 키가 설정되지 않아 기본 점수로 정렬했어요.", "AI is not configured, so the basic score is used.")}
            </p>
          )}

          {ranked.length === 0 && (
            <div className="card flex flex-col items-center overflow-hidden px-6 pt-6 text-center md:flex-row md:items-end md:gap-6 md:px-10 md:pt-9 md:text-left">
              <p className="max-w-xs pb-2 text-sm leading-relaxed text-slate-500 md:self-center md:pb-10">
                {tr(
                  "다른 창에서 반대 역할의 프로필로 접속하면 여기에 나타나요. 그 사이 AI 버디와 대화해 보세요.",
                  "Open another window with the other role and it will show up here. Meanwhile, chat with an AI buddy.",
                )}
              </p>
              <Crew className="w-full max-w-[500px] md:-mr-5" />
            </div>
          )}
          <ul className={`grid gap-3 md:grid-cols-2 ${ranked.length ? "" : "hidden"}`}>
              {ranked.map(({ profile: o, status: st, score }) => {
                const pick = ai[o.id];
                const shared = sharedInterests(me, o);
                return (
                  <li key={o.id} className="card card-hover flex flex-col p-4">
                    <div className="flex items-start gap-3">
                      <Avatar p={o} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate font-semibold">{o.nickname}</p>
                          <RoleBadge p={o} />
                          {o.uid && friendUids.has(o.uid) && (
                            <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-600">{tr("친구", "Friend")}</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {o.country}
                          {o.major ? ` · ${o.major}` : ""} · KO {labels.level(o.koreanLevel)} · EN {labels.level(o.englishLevel)}
                        </p>
                      </div>
                      <span className="text-right">
                        <span className="block text-lg font-bold leading-none tabular-nums text-brand-600">{score}</span>
                        <span className="text-[10px] text-slate-400">{tr("궁합", "fit")}</span>
                      </span>
                    </div>
                    {o.intro && <p className="mt-3 text-sm text-slate-700">“{o.intro}”</p>}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {o.interests.map((i) => (
                        <span
                          key={i}
                          className={`rounded px-1.5 py-0.5 text-xs ${shared.includes(i) ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}
                        >
                          {labels.interest(i)}
                        </span>
                      ))}
                    </div>
                    {pick && (
                      <div className="mt-3 rounded-lg bg-brand-50 p-3 text-sm text-brand-900">
                        <p>✦ {pick.reason}</p>
                        <p className="mt-1 text-xs text-brand-700">
                          {tr("첫 마디 추천", "Opener")}: “{pick.icebreaker}”
                        </p>
                      </div>
                    )}
                    <div className="mt-4 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span className={`h-2 w-2 rounded-full ${st === "busy" ? "bg-slate-300" : "bg-emerald-500"}`} />
                        {st === "busy" ? tr("대화 중", "Busy") : st === "searching" ? tr("매칭 대기 중", "Looking for a match") : tr("대화 가능", "Available")}
                      </span>
                      <button className="btn-primary px-3 py-1.5" disabled={st === "busy" || !!pendingTo} onClick={() => requestChat(o)}>
                        {tr("대화 신청", "Say hi")}
                      </button>
                    </div>
                  </li>
                );
              })}
          </ul>
          </div>
        </section>
      </div>

      {pendingTo && status !== "searching" && (
        <Modal>
          <p className="text-lg font-semibold">
            {tr("{name} 님의 수락을 기다리는 중…", "Waiting for {name} to accept…", { name: pendingProfile?.nickname ?? "" })}
          </p>
          <button className="btn-ghost mt-5 w-full" onClick={cancelRequest}>
            {tr("신청 취소", "Cancel")}
          </button>
        </Modal>
      )}

      {incoming && (
        <Modal>
          <div className="flex items-center gap-3">
            <Avatar p={incoming.from} size="lg" />
            <div>
              <p className="text-lg font-semibold">
                {incoming.from.uid && friendUids.has(incoming.from.uid)
                  ? tr("친구 {name} 님의 대화 신청", "Your friend {name} wants to chat", { name: incoming.from.nickname })
                  : tr("{name} 님의 대화 신청", "{name} wants to chat", { name: incoming.from.nickname })}
              </p>
              <p className="text-sm text-slate-500">
                {labels.role(incoming.from)} · {incoming.from.country} · {tr("궁합", "fit")} {matchScore(me, incoming.from)}
              </p>
            </div>
          </div>
          {incoming.from.intro && <p className="mt-3 text-sm text-slate-700">“{incoming.from.intro}”</p>}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button className="btn-ghost" onClick={() => answer(false)}>
              {tr("다음에", "Not now")}
            </button>
            <button className="btn-primary" onClick={() => answer(true)}>
              {tr("수락", "Accept")}
            </button>
          </div>
        </Modal>
      )}

      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm text-white">
          {toast}
        </div>
      )}
    </main>
  );
}

function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center overscroll-contain bg-slate-900/40 p-4">
      <div role="dialog" aria-modal="true" className="card w-full max-w-sm p-6 shadow-xl">
        {children}
      </div>
    </div>
  );
}

function QuestionOrb() {
  return (
    <svg viewBox="0 0 64 64" width="64" height="64" className="shrink-0" aria-hidden>
      <circle cx="32" cy="32" r="32" fill="#e3effc" />
      <circle cx="32" cy="32" r="24" fill="#fff" stroke="#b9d6f5" strokeWidth="1.5" strokeDasharray="3 4" />
      <path d="M25.5 25.5c0-3.9 3-6.5 6.8-6.5 3.9 0 6.7 2.5 6.7 5.9 0 2.7-1.6 4.1-3.6 5.4-1.8 1.1-2.6 2-2.6 3.9v1" fill="none" stroke="#00489b" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="32.8" cy="42.6" r="2.3" fill="#00489b" />
      <path d="M48 13l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2z" fill="#7cc3f2" />
      <circle cx="14" cy="47" r="2" fill="#7cc3f2" />
    </svg>
  );
}
