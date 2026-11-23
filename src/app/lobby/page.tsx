"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLang, useT } from "@/lib/i18n";
import { getBlocked, hasSessionProfile, loadProfile, setPartner } from "@/lib/profile";
import { isDemoMode, openChannel, type RTChannel } from "@/lib/realtime";
import { matchScore, sharedInterests } from "@/lib/matching";
import type { Profile } from "@/lib/types";
import { Avatar, RoleBadge, useLabels } from "@/components/ProfileBits";

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
  const ch = useRef<RTChannel | null>(null);
  const stateRef = useRef({ status, pendingTo, incoming });
  stateRef.current = { status, pendingTo, incoming };

  useEffect(() => {
    if (!hasSessionProfile()) {
      router.replace("/onboard");
      return;
    }
    setMe(loadProfile());
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

  if (!me) return null;
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

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <Avatar p={me} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-lg font-bold">{me.nickname}</p>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                  <RoleBadge p={me} /> {me.country}
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {me.goals.map((g) => (
                <span key={g} className="rounded bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                  {labels.goal(me, g)}
                </span>
              ))}
            </div>
            <Link href="/onboard" className="mt-4 block text-xs text-slate-500 underline-offset-2 hover:underline">
              {tr("프로필 수정", "Edit profile")}
            </Link>
          </div>

          <div className="card space-y-3 p-5">
            <h2 className="font-semibold">{tr("랜덤 매칭", "Random match")}</h2>
            <p className="text-sm text-slate-600">
              {tr(
                "지금 대기 중인 사람 중 가장 잘 맞는 상대와 바로 연결해요. 한국 학생은 유학생과, 유학생은 한국 학생과 우선 연결돼요.",
                "Connect right away with the best-fitting person who is also waiting. Korean and international students are paired first.",
              )}
            </p>
            {status === "searching" ? (
              <button className="btn-ghost w-full" onClick={() => setStatus("idle")}>
                <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
                {tr("상대를 찾는 중… (취소)", "Searching… (cancel)")}
              </button>
            ) : (
              <button className="btn-primary w-full" onClick={() => setStatus("searching")} disabled={!!pendingTo}>
                {tr("랜덤 매칭 시작", "Start random match")}
              </button>
            )}
          </div>

          <div className="card space-y-3 p-5">
            <h2 className="font-semibold">{tr("AI 연습 버디", "AI practice buddy")}</h2>
            <p className="text-sm text-slate-600">
              {tr(
                "접속한 사람이 없을 때, AI 버디와 먼저 대화를 연습해 보세요.",
                "No one online? Warm up by chatting with an AI buddy first.",
              )}
            </p>
            <button className="btn-ghost w-full" onClick={() => router.push(`/chat/ai-${crypto.randomUUID().slice(0, 8)}`)}>
              {me.role === "korean" ? tr("Emma (프랑스 유학생)와 대화", "Chat with Emma (from France)") : tr("민준 (한국 학생)과 대화", "Chat with Minjun (Korean student)")}
            </button>
          </div>
        </aside>

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-brand-900">{tr("지금 접속 중인 버디", "Buddies online now")}</h1>
              <p className="text-sm text-slate-500">
                {others.length
                  ? tr(`${others.length}명 · 잘 맞는 순서로 정렬했어요`, `${others.length} online · sorted by fit`)
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

          {ranked.length === 0 ? (
            <div className="card grid place-items-center p-12 text-center">
              <p className="font-medium">{tr("버디를 기다리는 중이에요", "Waiting for buddies")}</p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                {tr(
                  "다른 창에서 반대 역할의 프로필로 접속하면 여기에 나타나요. 그 사이 AI 연습 버디와 대화해 보세요.",
                  "Open another window with the other role and it will show up here. Meanwhile, try the AI practice buddy.",
                )}
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {ranked.map(({ profile: o, status: st, score }) => {
                const pick = ai[o.id];
                const shared = sharedInterests(me, o);
                return (
                  <li key={o.id} className="card flex flex-col p-4">
                    <div className="flex items-start gap-3">
                      <Avatar p={o} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate font-semibold">{o.nickname}</p>
                          <RoleBadge p={o} />
                        </div>
                        <p className="text-xs text-slate-500">
                          {o.country}
                          {o.major ? ` · ${o.major}` : ""} · KO {labels.level(o.koreanLevel)} · EN {labels.level(o.englishLevel)}
                        </p>
                      </div>
                      <span className="text-right">
                        <span className="block text-lg font-bold leading-none text-brand-600">{score}</span>
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
          )}
        </section>
      </div>

      {pendingTo && status !== "searching" && (
        <Modal>
          <p className="text-lg font-semibold">
            {tr(`${pendingProfile?.nickname ?? "상대"} 님의 수락을 기다리는 중…`, `Waiting for ${pendingProfile?.nickname ?? "them"} to accept…`)}
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
                {tr(`${incoming.from.nickname} 님의 대화 신청`, `${incoming.from.nickname} wants to chat`)}
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
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm text-white">{toast}</div>
      )}
    </main>
  );
}

function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4">
      <div className="card w-full max-w-sm p-6 shadow-xl">{children}</div>
    </div>
  );
}
