"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LANGS, useLang, useT } from "@/lib/i18n";
import { block, getPartner, hasSessionProfile, loadProfile } from "@/lib/profile";
import { openChannel, type RTChannel } from "@/lib/realtime";
import { useVideoCall } from "@/lib/useVideoCall";
import { sharedInterests } from "@/lib/matching";
import type { ChatMessage, Profile } from "@/lib/types";
import { Avatar, RoleBadge, useLabels } from "@/components/ProfileBits";

interface Topic {
  topic: string;
  line: string;
  en: string;
}
interface Translation {
  text: string | null;
  tip?: string;
  loading?: boolean;
}

function aiPartnerFor(me: Profile): Profile {
  return me.role === "korean"
    ? {
        id: "ai-emma",
        nickname: "Emma (AI)",
        avatar: "🦊",
        role: "international",
        country: "France",
        major: "Business",
        koreanLevel: "basic",
        englishLevel: "fluent",
        interests: ["drama", "cafe", "travel", "food"],
        goals: ["friend", "korean", "life"],
        intro: "Bonjour! Exchange student at Jukjeon campus. Help me with Korean life? 🙏",
      }
    : {
        id: "ai-minjun",
        nickname: "민준 Minjun (AI)",
        avatar: "🐻",
        role: "korean",
        country: "대한민국 Korea",
        major: "Computer Science",
        koreanLevel: "native",
        englishLevel: "conversational",
        interests: ["games", "tech", "food", "kpop"],
        goals: ["friend", "english", "help"],
        intro: "단국대 소프트웨어학과 학생이에요. 학교생활 뭐든 물어보세요!",
      };
}

export default function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const isAi = roomId.startsWith("ai-");
  const tr = useT();
  const { lang } = useLang();
  const labels = useLabels();
  const router = useRouter();

  const [me, setMe] = useState<Profile | null>(null);
  const [partner, setPartnerState] = useState<Profile | null>(null);
  const [partnerHere, setPartnerHere] = useState(false);
  const [partnerLeft, setPartnerLeft] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [translations, setTranslations] = useState<Record<string, Translation>>({});
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [draftBusy, setDraftBusy] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showVideoRules, setShowVideoRules] = useState(false);
  const [channel, setChannel] = useState<RTChannel | null>(null);
  const seenPartner = useRef(false);
  const lastTypingSent = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const addSystem = useCallback((key: string) => {
    setMessages((m) => [...m, { id: crypto.randomUUID(), from: "system", text: key, ts: Date.now() }]);
  }, []);

  // load identity
  useEffect(() => {
    if (!hasSessionProfile()) {
      router.replace("/onboard");
      return;
    }
    const p = loadProfile()!;
    setMe(p);
    if (isAi) {
      setPartnerState(aiPartnerFor(p));
      setPartnerHere(true);
    } else setPartnerState(getPartner(roomId));
  }, [roomId, isAi, router]);

  // realtime room
  useEffect(() => {
    if (!me || isAi) return;
    const c = openChannel(`room:${roomId}`, me.id);
    c.on("msg", (m: ChatMessage) => {
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      setTyping(false);
    });
    c.on("typing", () => {
      setTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 3000);
    });
    c.on("bye", () => {
      setPartnerLeft(true);
      setPartnerHere(false);
    });
    c.onPresence((list: { profile: Profile }[]) => {
      const other = list.find((s) => s?.profile && s.profile.id !== me.id);
      if (other) {
        seenPartner.current = true;
        setPartnerState(other.profile);
        setPartnerHere(true);
        setPartnerLeft(false);
      } else if (seenPartner.current) {
        setPartnerHere(false);
        setPartnerLeft(true);
      }
    });
    setChannel(c);
    return () => {
      c.send("bye", {});
      c.close();
      setChannel(null);
    };
  }, [me, roomId, isAi]);

  const video = useVideoCall(channel, me?.id ?? "", addSystem);

  // subscribe after every handler (chat + video) is registered
  useEffect(() => {
    if (!channel || !me) return;
    channel.subscribe();
    channel.track({ profile: me });
  }, [channel, me]);

  useEffect(() => {
    if (partnerLeft) {
      addSystem("partner-left");
      if (video.state !== "off") video.end();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerLeft]);

  // Escape closes the confirmation dialogs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setShowReport(false);
      setShowVideoRules(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing, aiThinking]);

  // AI buddy greeting
  const greeted = useRef(false);
  useEffect(() => {
    if (!isAi || !me || greeted.current) return;
    greeted.current = true;
    askAiBuddy([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAi, me]);

  async function askAiBuddy(history: ChatMessage[]) {
    if (!me) return;
    setAiThinking(true);
    try {
      const res = await fetch("/api/ai/buddy", {
        method: "POST",
        body: JSON.stringify({
          me,
          history: history
            .filter((m) => m.from !== "system")
            .map((m) => ({ role: m.from === me.id ? "user" : "assistant", content: m.text })),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), from: "ai", text: data.text, ts: Date.now() }]);
    } finally {
      setAiThinking(false);
    }
  }

  const loadTopics = useCallback(async () => {
    if (!me) return;
    setTopicsLoading(true);
    try {
      const res = await fetch("/api/ai/topics", {
        method: "POST",
        body: JSON.stringify({
          me,
          partner,
          lang,
          recent: messages
            .filter((m) => m.from !== "system")
            .slice(-12)
            .map((m) => ({ who: m.from === me.id ? "me" : "partner", text: m.text })),
        }),
      });
      const data = await res.json();
      setTopics(data.topics ?? []);
    } finally {
      setTopicsLoading(false);
    }
  }, [me, partner, lang, messages]);

  const topicsLoaded = useRef(false);
  useEffect(() => {
    if (me && partner && !topicsLoaded.current) {
      topicsLoaded.current = true;
      loadTopics();
    }
  }, [me, partner, loadTopics]);

  function send(text = draft) {
    const t = text.trim();
    if (!t || !me || partnerLeft) return;
    const msg: ChatMessage = { id: crypto.randomUUID(), from: me.id, text: t.slice(0, 1000), ts: Date.now() };
    const next = [...messages, msg];
    setMessages(next);
    setDraft("");
    if (isAi) askAiBuddy(next);
    else channel?.send("msg", msg);
  }

  function onDraftChange(v: string) {
    setDraft(v);
    if (!isAi && Date.now() - lastTypingSent.current > 1500) {
      lastTypingSent.current = Date.now();
      channel?.send("typing", {});
    }
  }

  async function translateMessage(m: ChatMessage) {
    if (translations[m.id]?.text) {
      setTranslations((t) => {
        const n = { ...t };
        delete n[m.id];
        return n;
      });
      return;
    }
    setTranslations((t) => ({ ...t, [m.id]: { text: null, loading: true } }));
    const res = await fetch("/api/ai/translate", { method: "POST", body: JSON.stringify({ text: m.text, target: lang }) });
    const data = await res.json();
    setTranslations((t) => ({
      ...t,
      [m.id]: { text: data.text ?? tr("AI 키가 설정되지 않아 번역할 수 없어요.", "Translation needs the AI key to be configured."), tip: data.tip },
    }));
  }

  /** Rewrite my draft in the partner's language (e.g. Korean → English for practice). */
  async function translateDraft() {
    if (!draft.trim() || !partner) return;
    setDraftBusy(true);
    try {
      const target = partner.role === "korean" ? "ko" : "en";
      const res = await fetch("/api/ai/translate", { method: "POST", body: JSON.stringify({ text: draft, target }) });
      const data = await res.json();
      if (data.text) setDraft(data.text);
    } finally {
      setDraftBusy(false);
    }
  }

  async function report(reason: string) {
    if (!partner || !me) return;
    await fetch("/api/report", { method: "POST", body: JSON.stringify({ roomId, reporter: me.id, reported: partner.id, reason }) });
    block(partner.id);
    leave();
  }

  function leave() {
    if (video.state !== "off") video.end();
    router.push("/lobby");
  }

  const systemText = useMemo(
    () =>
      ({
        "partner-left": tr("상대가 대화방을 나갔어요.", "Your buddy left the chat."),
        "video-declined": tr("상대가 화상 대화를 거절했어요. 텍스트로 계속 이야기해요.", "Video was declined. Keep chatting by text."),
        "video-ended": tr("화상 대화가 종료되었어요.", "Video call ended."),
        "video-failed": tr("화상 연결에 실패했어요. 네트워크를 확인해 주세요.", "Video connection failed. Check your network."),
        "camera-error": tr("카메라·마이크를 사용할 수 없어요. 브라우저 권한을 확인해 주세요.", "Camera or microphone is unavailable. Check browser permissions."),
      }) as Record<string, string>,
    [tr],
  );

  if (!me || !partner) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center text-slate-500">
        {tr("대화방에 연결하는 중…", "Connecting to the chat…")}
      </main>
    );
  }

  const shared = sharedInterests(me, partner);
  const videoActive = video.state === "connecting" || video.state === "on";

  return (
    <main className="mx-auto grid h-[calc(100dvh-56px)] max-w-6xl gap-4 px-0 sm:px-4 sm:py-4 lg:grid-cols-[1fr_300px]">
      <section className="flex min-h-0 flex-col overflow-hidden bg-white sm:rounded-xl sm:border sm:border-slate-200">
        {/* header */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <Avatar p={partner} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate font-semibold">{partner.nickname}</p>
              <RoleBadge p={partner} />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className={`h-1.5 w-1.5 rounded-full ${partnerHere ? "bg-emerald-500" : "bg-slate-300"}`} />
              {partnerLeft ? tr("나감", "Left") : partnerHere ? tr("접속 중", "Online") : tr("상대를 기다리는 중", "Waiting for buddy")}
              {" · "}
              {partner.country}
            </p>
          </div>
          {!isAi && (
            <button
              className="btn-primary px-3 py-2"
              onClick={() => setShowVideoRules(true)}
              disabled={!partnerHere || video.state !== "off"}
              title={tr("화상 대화 요청", "Request video")}
            >
              <VideoIcon /> <span className="hidden sm:inline">{tr("화상 전환", "Video")}</span>
            </button>
          )}
          <button className="btn-ghost px-3 py-2" onClick={leave}>
            {tr("나가기", "Leave")}
          </button>
        </div>

        {/* video area */}
        {videoActive && (
          <div className="relative bg-slate-900">
            <div className="aspect-video max-h-[45vh] w-full">
              {video.remoteStream ? (
                <VideoEl stream={video.remoteStream} label={tr("상대 화면", "Your buddy's video")} className="h-full w-full object-contain" />
              ) : (
                <div className="grid h-full place-items-center text-sm text-slate-300">{tr("연결 중…", "Connecting…")}</div>
              )}
            </div>
            {video.localStream && (
              <VideoEl
                stream={video.localStream}
                label={tr("내 화면", "Your video")}
                muted
                className="absolute bottom-3 right-3 w-28 rounded-lg border-2 border-white/70 object-cover sm:w-40"
              />
            )}
            <div className="absolute bottom-3 left-3 flex gap-2">
              <button className="btn bg-white/90 px-3 py-1.5 text-slate-800" aria-pressed={!video.micOn} onClick={video.toggleMic}>
                {video.micOn ? tr("마이크 끄기", "Mute") : tr("마이크 켜기", "Unmute")}
              </button>
              <button className="btn bg-white/90 px-3 py-1.5 text-slate-800" aria-pressed={!video.camOn} onClick={video.toggleCam}>
                {video.camOn ? tr("카메라 끄기", "Camera off") : tr("카메라 켜기", "Camera on")}
              </button>
              <button className="btn bg-red-600 px-3 py-1.5 text-white" onClick={video.end}>
                {tr("텍스트로 돌아가기", "Back to text")}
              </button>
            </div>
          </div>
        )}

        {/* banners */}
        {video.state === "incoming" && (
          <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-brand-100 bg-brand-50 px-4 py-3 text-sm">
            <VideoIcon />
            <span className="flex-1 text-brand-900">
              {tr("{name} 님이 화상 대화를 요청했어요. 수락하면 카메라·마이크가 켜져요.", "{name} wants to switch to video. Accepting turns on your camera and mic.", { name: partner.nickname })}
            </span>
            <button className="btn-ghost px-3 py-1.5" onClick={video.decline}>
              {tr("거절", "Decline")}
            </button>
            <button className="btn-primary px-3 py-1.5" onClick={video.accept}>
              {tr("수락", "Accept")}
            </button>
          </div>
        )}
        {video.state === "requesting" && (
          <div className="flex items-center gap-3 border-b border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
            <span className="flex-1">{tr("상대의 수락을 기다리는 중…", "Waiting for your buddy to accept…")}</span>
            <button className="btn-ghost px-3 py-1.5" onClick={video.cancel}>
              {tr("취소", "Cancel")}
            </button>
          </div>
        )}

        {/* messages */}
        <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4" role="log" aria-live="polite">
          <div className="mx-auto max-w-md rounded-lg bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
            {isAi
              ? tr("AI 연습 버디와의 대화예요. 실제 사람이 아니에요.", "This is an AI practice buddy, not a real person.")
              : tr(
                  "대화 내용은 서버에 저장되지 않아요. 개인정보(연락처, 주소)는 신중하게 공유해 주세요.",
                  "Messages are not stored on a server. Be careful sharing personal info (phone, address).",
                )}
            {shared.length > 0 && (
              <span className="mt-1 block text-brand-700">
                {tr("공통 관심사", "In common")}: {shared.map(labels.interest).join(", ")}
              </span>
            )}
          </div>

          {messages.map((m) => {
            if (m.from === "system")
              return (
                <p key={m.id} className="text-center text-xs text-slate-500">
                  {systemText[m.text] ?? m.text}
                </p>
              );
            const mine = m.from === me.id;
            const tl = translations[m.id];
            return (
              <div key={m.id} className={`group flex ${mine ? "justify-end" : "items-end gap-2"}`}>
                {!mine && <Avatar p={partner} size="sm" />}
                <div className={`max-w-[78%] ${mine ? "items-end" : ""} flex flex-col`}>
                  <p
                    className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed ${
                      mine ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md bg-slate-100 text-slate-900"
                    }`}
                  >
                    {m.text}
                  </p>
                  {tl && (
                    <div className={`mt-1 rounded-lg border border-brand-100 bg-brand-50 px-3 py-1.5 text-sm text-brand-900 ${mine ? "self-end" : ""}`}>
                      {tl.loading ? tr("번역 중…", "Translating…") : tl.text}
                      {tl.tip && <span className="mt-0.5 block text-xs text-brand-700">{tl.tip}</span>}
                    </div>
                  )}
                  <button
                    onClick={() => translateMessage(m)}
                    className={`mt-0.5 text-[11px] text-slate-400 hover:text-brand-600 ${mine ? "self-end" : "self-start"}`}
                  >
                    {tl?.text ? tr("번역 숨기기", "Hide translation") : tr("번역", "Translate")} ·{" "}
                    {new Date(m.ts).toLocaleTimeString(LANGS.find((l) => l.key === lang)?.locale, { hour: "numeric", minute: "2-digit" })}
                  </button>
                </div>
              </div>
            );
          })}
          {(typing || aiThinking) && (
            <div className="flex items-end gap-2">
              <Avatar p={partner} size="sm" />
              <p className="rounded-2xl rounded-bl-md bg-slate-100 px-3.5 py-2 text-sm text-slate-500">
                <span className="inline-flex gap-1">
                  <Dot /> <Dot delay="150ms" /> <Dot delay="300ms" />
                </span>
              </p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* composer */}
        <form
          className="border-t border-slate-200 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          {topics.length > 0 && (
            <div className="-mx-3 mb-2 flex gap-2 overflow-x-auto px-3 lg:hidden">
              {topics.map((t, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setDraft(t.line)}
                  className="shrink-0 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs text-brand-700"
                >
                  ✦ {t.topic}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              name="message"
              aria-label={tr("메시지를 입력하세요", "Type a message")}
              autoComplete="off"
              className="input max-h-32 min-h-11 flex-1 resize-none"
              rows={1}
              value={draft}
              disabled={partnerLeft}
              placeholder={partnerLeft ? tr("상대가 나갔어요", "Your buddy left") : tr("메시지를 입력하세요", "Type a message")}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button className="btn-primary h-11" disabled={!draft.trim() || partnerLeft}>
              {tr("전송", "Send")}
            </button>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs">
            <button type="button" className="text-brand-600 hover:underline disabled:opacity-50" onClick={translateDraft} disabled={!draft.trim() || draftBusy}>
              ✦ {draftBusy ? tr("변환 중…", "Converting…") : partner.role === "korean" ? tr("한국어로 바꿔 쓰기", "Rewrite in Korean") : tr("영어로 바꿔 쓰기", "Rewrite in English")}
            </button>
            <span className="text-slate-300">|</span>
            {!isAi && (
              <button type="button" className="text-slate-500 hover:text-red-600" onClick={() => setShowReport(true)}>
                {tr("신고·차단", "Report / block")}
              </button>
            )}
          </div>
        </form>
      </section>

      {/* side panel */}
      <aside className="hidden min-h-0 flex-col gap-4 overflow-y-auto lg:flex">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <Avatar p={partner} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-bold">{partner.nickname}</p>
              <p className="text-xs text-slate-500">
                {partner.country}
                {partner.major ? ` · ${partner.major}` : ""}
              </p>
            </div>
          </div>
          {partner.intro && <p className="mt-3 text-sm text-slate-700">“{partner.intro}”</p>}
          <dl className="mt-3 space-y-1 text-xs text-slate-600">
            <div className="flex justify-between">
              <dt>{tr("한국어", "Korean")}</dt>
              <dd>{labels.level(partner.koreanLevel)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{tr("영어", "English")}</dt>
              <dd>{labels.level(partner.englishLevel)}</dd>
            </div>
          </dl>
          <div className="mt-3 flex flex-wrap gap-1">
            {partner.goals.map((g) => (
              <span key={g} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                {labels.goal(partner, g)}
              </span>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-brand-900">✦ {tr("AI 대화 주제", "AI topic ideas")}</h3>
            <button className="text-xs text-brand-600 hover:underline disabled:opacity-50" onClick={loadTopics} disabled={topicsLoading}>
              {topicsLoading ? tr("생성 중…", "Thinking…") : tr("새로 추천", "Refresh")}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">{tr("누르면 입력창에 넣어 드려요.", "Tap to put it in the message box.")}</p>
          <ul className="mt-3 space-y-2">
            {topics.map((t, i) => (
              <li key={i}>
                <button
                  className="w-full rounded-lg border border-slate-200 p-3 text-left transition hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-50"
                  onClick={() => setDraft(t.line)}
                >
                  <span className="block text-xs font-semibold text-brand-700">{t.topic}</span>
                  <span className="mt-1 block text-sm text-slate-800">{t.line}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{t.en}</span>
                </button>
              </li>
            ))}
            {!topics.length && topicsLoading && <li className="text-sm text-slate-400">{tr("불러오는 중…", "Loading…")}</li>}
          </ul>
        </div>
      </aside>

      {showVideoRules && (
        <div className="fixed inset-0 z-40 grid place-items-center overscroll-contain bg-slate-900/40 p-4">
          <div role="dialog" aria-modal="true" className="card w-full max-w-sm p-6 shadow-xl">
            <p className="text-lg font-semibold">{tr("화상 대화를 요청할까요?", "Request a video call?")}</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>{tr("상대가 수락해야만 화상이 시작돼요.", "Video starts only if your buddy accepts.")}</li>
              <li>{tr("영상은 서로의 브라우저 사이에서 직접 전송되고 녹화·저장되지 않아요.", "Video goes directly between your browsers and is never recorded.")}</li>
              <li>{tr("불편하면 언제든 '텍스트로 돌아가기'를 누르세요.", "Feel uncomfortable? Press 'Back to text' anytime.")}</li>
            </ul>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button className="btn-ghost" onClick={() => setShowVideoRules(false)}>
                {tr("취소", "Cancel")}
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  setShowVideoRules(false);
                  video.request();
                }}
              >
                {tr("요청 보내기", "Send request")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReport && (
        <div className="fixed inset-0 z-40 grid place-items-center overscroll-contain bg-slate-900/40 p-4">
          <div role="dialog" aria-modal="true" className="card w-full max-w-sm p-6 shadow-xl">
            <p className="text-lg font-semibold">{tr("신고하고 차단할까요?", "Report and block?")}</p>
            <p className="mt-1 text-sm text-slate-600">{tr("대화가 종료되고 이 사용자는 다시 매칭되지 않아요.", "The chat ends and you won't be matched with this person again.")}</p>
            <div className="mt-4 grid gap-2">
              {[
                tr("불쾌한 언행·괴롭힘", "Harassment or offensive language"),
                tr("부적절한 화상 노출", "Inappropriate video"),
                tr("스팸·광고·금전 요구", "Spam, ads or asking for money"),
                tr("기타", "Other"),
              ].map((r) => (
                <button key={r} className="btn-ghost justify-start" onClick={() => report(r)}>
                  {r}
                </button>
              ))}
            </div>
            <button className="mt-3 w-full text-sm text-slate-500" onClick={() => setShowReport(false)}>
              {tr("취소", "Cancel")}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function VideoEl({ stream, muted, className, label }: { stream: MediaStream; muted?: boolean; className?: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} aria-label={label} className={className} />;
}

function VideoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m22 8-6 4 6 4V8Z" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </svg>
  );
}

function Dot({ delay = "0ms" }: { delay?: string }) {
  return <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: delay }} />;
}
