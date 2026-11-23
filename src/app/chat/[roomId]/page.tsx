"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LANGS, useLang, useT } from "@/lib/i18n";
import { addFriend, block, clearLog, getPartner, hasSessionProfile, isFriend, loadLog, loadProfile, saveLog } from "@/lib/profile";
import { openChannel, type RTChannel } from "@/lib/realtime";
import { useVideoCall } from "@/lib/useVideoCall";
import { sharedInterests } from "@/lib/matching";
import type { ChatMessage, Profile } from "@/lib/types";
import { Avatar, useLabels } from "@/components/ProfileBits";
import { AiBuddyScreen, BuddyLiveVideo, speak, useAiVideo } from "@/components/AiVideo";
import { SelfTile } from "@/components/SelfTile";
import { AttachButton, PhotoViewer } from "@/components/PhotoAttach";
import { PipStage } from "@/components/PipStage";
import { buddyById, buddyForRoom } from "@/lib/aiBuddies";

interface Translation {
  text: string | null;
  tip?: string;
  loading?: boolean;
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
  const [photo, setPhoto] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [translations, setTranslations] = useState<Record<string, Translation>>({});
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [showVideoRules, setShowVideoRules] = useState(false);
  const aiPipVideo = useRef<HTMLVideoElement>(null);
  const [aiHelloDone, setAiHelloDone] = useState(false);
  const markAiHelloDone = useCallback(() => setAiHelloDone(true), []);
  const [confirmEnd, setConfirmEnd] = useState<"ai" | "human" | "leave" | null>(null);
  // swipe from left to right to go back to the lobby (asks first, like the old Leave button)
  const [dragX, setDragX] = useState(0);
  const swipe = useRef<{ x: number; y: number; on: boolean } | null>(null);
  const swipeGoal = () => Math.min(120, window.innerWidth * 0.3);
  function onSwipeStart(e: React.TouchEvent) {
    const el = e.target as HTMLElement;
    swipe.current =
      e.touches.length === 1 && !el.closest("input, textarea, video, [data-noswipe]") ? { x: e.touches[0].clientX, y: e.touches[0].clientY, on: false } : null;
  }
  function onSwipeMove(e: React.TouchEvent) {
    const s = swipe.current;
    if (!s) return;
    const dx = e.touches[0].clientX - s.x;
    const dy = e.touches[0].clientY - s.y;
    if (!s.on) {
      if (dx > 14 && dx > Math.abs(dy) * 1.5) s.on = true;
      else if (Math.abs(dy) > 14 || dx < -14) swipe.current = null;
      if (!s.on) return;
    }
    setDragX(Math.max(0, dx));
  }
  function onSwipeEnd() {
    if (swipe.current?.on && dragX >= swipeGoal()) setConfirmEnd("leave");
    swipe.current = null;
    setDragX(0);
  }
  const [channel, setChannel] = useState<RTChannel | null>(null);
  const [friend, setFriend] = useState<"none" | "sent" | "incoming" | "friends">("none");
  const friendRef = useRef(friend);
  friendRef.current = friend;
  const restored = useRef(false);
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
    // the chat stays until you leave the room (refresh, video on/off, small window)
    const log = loadLog(roomId);
    if (log.length) {
      restored.current = true;
      setMessages(log);
    }
    if (isAi) {
      setPartnerState(buddyForRoom(roomId, p.role).profile);
      setPartnerHere(true);
    } else setPartnerState(getPartner(roomId));
  }, [roomId, isAi, router]);

  useEffect(() => {
    if (me && messages.length) saveLog(roomId, messages);
  }, [me, roomId, messages]);

  useEffect(() => {
    if (me && partner) setFriend((f) => (isFriend(me.uid, partner) ? "friends" : f === "friends" ? "none" : f));
  }, [me, partner]);

  // realtime room
  useEffect(() => {
    if (!me || isAi) return;
    const c = openChannel(`room:${roomId}`, me.id);
    c.on("msg", (m: ChatMessage) => {
      if (m.image && (typeof m.image !== "string" || !m.image.startsWith("data:image/"))) delete m.image;
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
    c.on("friend-req", ({ from }: { from: Profile }) => {
      if (isFriend(me.uid, from)) {
        c.send("friend-ok", { from: me });
        return;
      }
      setPartnerState(from);
      setFriend((f) => (f === "sent" ? f : "incoming"));
    });
    c.on("friend-ok", ({ from }: { from: Profile }) => {
      addFriend(me.uid, from);
      setPartnerState(from);
      if (friendRef.current !== "friends") addSystem("friend-added");
      setFriend("friends");
    });
    c.on("friend-no", () => {
      setFriend("none");
      addSystem("friend-declined");
    });
    // a refresh drops out of the room for a moment, so wait a little before saying the buddy left
    let goneTimer: ReturnType<typeof setTimeout> | null = null;
    c.onPresence((list: { profile: Profile }[]) => {
      const other = list.find((s) => s?.profile && s.profile.id !== me.id);
      if (other) {
        if (goneTimer) clearTimeout(goneTimer);
        goneTimer = null;
        seenPartner.current = true;
        setPartnerState(other.profile);
        setPartnerHere(true);
        setPartnerLeft(false);
      } else if (seenPartner.current && !goneTimer) {
        setPartnerHere(false);
        goneTimer = setTimeout(() => setPartnerLeft(true), 8000);
      }
    });
    setChannel(c);
    return () => {
      if (goneTimer) clearTimeout(goneTimer);
      c.close();
      setChannel(null);
    };
  }, [me, roomId, isAi, addSystem]);

  const video = useVideoCall(channel, me?.id ?? "", addSystem);

  // video call with the AI practice buddy (pre-generated clips + browser voice)
  const aiVideo = useAiVideo(addSystem);
  useEffect(() => {
    if (aiVideo.state !== "on") setAiHelloDone(false);
  }, [aiVideo.state]);
  const aiVideoOn = useRef(false);
  aiVideoOn.current = aiVideo.state === "on";
  const [aiTalking, setAiTalking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const voiceOnRef = useRef(voiceOn);
  voiceOnRef.current = voiceOn;
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  function stopAiVideo(announce = true) {
    if (aiVideo.state === "off") return;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    aiVideo.stop();
    setAiTalking(false);
    if (announce) addSystem("video-ended");
  }

  // subscribe after every handler (chat + video) is registered
  useEffect(() => {
    if (!channel || !me) return;
    channel.subscribe();
    channel.track({ profile: me });
  }, [channel, me]);

  useEffect(() => {
    if (partnerLeft) {
      if (messagesRef.current[messagesRef.current.length - 1]?.text !== "partner-left") addSystem("partner-left");
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
      setConfirmEnd(null);
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
    if (restored.current) return;
    askAiBuddy([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAi, me]);

  async function askAiBuddy(history: ChatMessage[], event?: "video-on" | "friend") {
    if (!me) return;
    setAiThinking(true);
    try {
      const started = Date.now();
      const res = await fetch("/api/ai/buddy", {
        method: "POST",
        body: JSON.stringify({
          me,
          event,
          bot: partner?.id ? buddyById(partner.id)?.key : undefined,
          history: history
            .filter((m) => m.from !== "system")
            .map((m) => ({ role: m.from === me.id ? "user" : "assistant", content: m.image ? `${m.text} (sent a photo)`.trim() : m.text })),
        }),
      });
      const data = await res.json();
      // A real person needs time to read and type, so show "typing…" for a while before the reply appears.
      // On video she answers out loud, so the pause is shorter.
      const pause = aiVideoOn.current ? 1200 + Math.random() * 1300 : replyDelay(String(data.text ?? ""));
      const wait = pause - (Date.now() - started);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), from: "ai", text: data.text, ts: Date.now() }]);
      setAiThinking(false);
      if (aiVideoOn.current) {
        setAiTalking(true);
        await speak(data.text, voiceOnRef.current);
        setAiTalking(false);
      }
    } finally {
      setAiThinking(false);
    }
  }


  function send(text = draft) {
    const t = text.trim();
    if ((!t && !photo) || !me || partnerLeft) return;
    const msg: ChatMessage = { id: crypto.randomUUID(), from: me.id, text: t.slice(0, 1000), ts: Date.now(), ...(photo ? { image: photo } : {}) };
    const next = [...messages, msg];
    setMessages(next);
    setDraft("");
    setPhoto(null);
    if (isAi) askAiBuddy(next);
    else channel?.send("msg", msg);
  }

  function onDraftChange(v: string) {
    setDraft(v);
    if (draftError) setDraftError(null);
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
    const data = await translateText(m.text, lang);
    setTranslations((t) => ({
      ...t,
      [m.id]: { text: data.text ?? aiErrorText(data.error), tip: data.tip },
    }));
  }

  /** Rewrite my draft in the partner's language (e.g. Korean → English for practice). */
  function aiErrorText(error?: string) {
    return error === "no-key"
      ? tr("AI 키가 설정되지 않아 번역할 수 없어요.", "Translation needs the AI key to be configured.")
      : tr("지금은 AI 번역이 잠시 안 돼요. 잠시 후 다시 시도해 주세요.", "AI translation isn't available right now. Please try again in a moment.");
  }

  async function translateDraft() {
    if (!draft.trim() || !partner) return;
    setDraftError(null);
    setDraftBusy(true);
    try {
      const target = partner.role === "korean" ? "ko" : "en";
      const data = await translateText(draft, target);
      if (data.text) setDraft(data.text);
      else setDraftError(aiErrorText(data.error));
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
    stopAiVideo(false);
    channel?.send("bye", {});
    clearLog(roomId);
    router.push("/lobby");
  }

  function requestFriend() {
    if (!me || !partner) return;
    if (isAi) {
      addFriend(me.uid, partner, true);
      setFriend("friends");
      addSystem("friend-added");
      askAiBuddy(messagesRef.current, "friend");
      return;
    }
    setFriend("sent");
    channel?.send("friend-req", { from: me });
  }

  function answerFriend(ok: boolean) {
    if (!me || !partner) return;
    if (ok) {
      addFriend(me.uid, partner);
      setFriend("friends");
      addSystem("friend-added");
      channel?.send("friend-ok", { from: me });
    } else {
      setFriend("none");
      channel?.send("friend-no", {});
    }
  }

  const systemText = useMemo(
    () =>
      ({
        "partner-left": tr("상대가 대화방을 나갔어요.", "Your buddy left the chat."),
        "video-declined": tr("상대가 화상 대화를 거절했어요. 텍스트로 계속 이야기해요.", "Video was declined. Keep chatting by text."),
        "video-ended": tr("화상 대화가 종료되었어요.", "Video call ended."),
        "video-failed": tr("화상 연결에 실패했어요. 네트워크를 확인해 주세요.", "Video connection failed. Check your network."),
        "camera-error": tr("카메라·마이크를 사용할 수 없어요. 브라우저 권한을 확인해 주세요.", "Camera or microphone is unavailable. Check browser permissions."),
        "friend-added": tr("{name} 님과 친구가 됐어요. 로비의 '내 친구'에서 다시 대화를 신청할 수 있어요.", "You and {name} are now friends. Find them under My friends in the lobby.", {
          name: partner?.nickname ?? "",
        }),
        "friend-declined": tr("상대가 친구 신청을 다음으로 미뤘어요.", "Your buddy said not now to the friend request."),
      }) as Record<string, string>,
    [tr, partner?.nickname],
  );

  if (!me || !partner) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center text-slate-500">
        {tr("대화방에 연결하는 중…", "Connecting to the chat…")}
      </main>
    );
  }

  const shared = sharedInterests(me, partner);
  const aiBuddy = isAi ? buddyById(partner.id) : undefined;
  const aiKey = aiBuddy?.key ?? "emma";
  const aiName = aiBuddy?.name ?? partner.nickname;
  const videoActive = video.state === "connecting" || video.state === "on";

  return (
    <main className="mx-auto grid h-[calc(100dvh-56px)] max-w-6xl gap-4 px-0 sm:px-4 sm:py-4 lg:grid-cols-[1fr_300px]">
      {dragX > 0 && (
        <div
          aria-hidden
          className="pointer-events-none fixed left-3 top-1/2 z-30 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-slate-900/70 text-white"
          style={{ opacity: Math.min(1, dragX / swipeGoal()) }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </div>
      )}
      <section
        className={`flex min-h-0 touch-pan-y flex-col overflow-hidden bg-white sm:rounded-xl sm:border sm:border-slate-200 ${dragX ? "" : "transition-transform duration-200"}`}
        style={dragX ? { transform: `translateX(${Math.round(dragX * 0.5)}px)` } : undefined}
        onTouchStart={onSwipeStart}
        onTouchMove={onSwipeMove}
        onTouchEnd={onSwipeEnd}
        onTouchCancel={onSwipeEnd}
      >
        {/* header */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          {/* on a computer there is no swipe, so a back arrow leaves the room */}
          <button
            type="button"
            className="-ml-2 hidden h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 [@media(pointer:fine)]:grid"
            onClick={() => setConfirmEnd("leave")}
            aria-label={tr("나가기", "Leave")}
            title={tr("나가기", "Leave")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <Avatar p={partner} />
          <div className="min-w-0 flex-1">
            <p className="break-words font-semibold leading-snug">{partner.nickname}</p>
            <p className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-500">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${partnerHere ? "bg-emerald-500" : "bg-slate-300"}`} />
              {partnerLeft ? tr("나감", "Left") : partnerHere ? tr("접속 중", "Online") : tr("상대를 기다리는 중", "Waiting for buddy")}
              <span className="truncate">
                {" · "}
                {partner.country}
              </span>
            </p>
          </div>
          <button
            className={`btn px-3 py-2 ${friend === "friends" ? "bg-rose-50 text-rose-600" : "btn-ghost"}`}
            onClick={requestFriend}
            disabled={friend !== "none" || (!isAi && (!partnerHere || partnerLeft))}
            aria-label={friend === "friends" ? tr("친구", "Friends") : friend === "sent" ? tr("친구 신청 보냄", "Friend request sent") : tr("친구 추가", "Add friend")}
            title={friend === "friends" ? tr("친구", "Friends") : friend === "sent" ? tr("친구 신청 보냄", "Friend request sent") : tr("친구 추가", "Add friend")}
          >
            <FriendIcon done={friend === "friends"} />
            <span className="hidden sm:inline">
              {friend === "friends" ? tr("친구", "Friends") : friend === "sent" ? tr("신청 보냄", "Request sent") : tr("친구 추가", "Add friend")}
            </span>
          </button>
          {(!isAi || aiVideo.state === "off") && (
            <button
              className="btn-primary px-3 py-2"
              onClick={() => setShowVideoRules(true)}
              disabled={isAi ? aiVideo.state !== "off" : !partnerHere || video.state !== "off"}
              title={tr("화상 대화 요청", "Request video")}
            >
              <VideoIcon /> <span className="hidden sm:inline">{tr("화상 전환", "Video")}</span>
            </button>
          )}
        </div>

        {/* video area */}
        {videoActive && (
          <PipStage fallbackVideo={() => document.querySelector<HTMLVideoElement>("video[data-pip-source]")}>
            {(pipButton, inPip) => (
          <div className={`relative bg-slate-900 ${inPip ? "h-full" : ""}`}>
            <div className={inPip ? "h-full w-full" : "aspect-video max-h-[45vh] w-full"}>
              {video.remoteStream ? (
                <VideoEl pipSource stream={video.remoteStream} label={tr("상대 화면", "Your buddy's video")} className="h-full w-full object-contain" />
              ) : (
                <div className="grid h-full place-items-center text-sm text-slate-300">{tr("연결 중…", "Connecting…")}</div>
              )}
            </div>
            <SelfTile
              stream={video.localStream}
              camOn={video.camOn}
              name={me.nickname}
              noVideoText={tr("비디오 없음", "No video")}
              videoLabel={tr("내 화면", "Your video")}
              controls={[
                { kind: "mic", on: video.micOn, label: video.micOn ? tr("마이크 끄기", "Mute") : tr("마이크 켜기", "Unmute"), onClick: video.toggleMic },
                { kind: "cam", on: video.camOn, label: video.camOn ? tr("카메라 끄기", "Camera off") : tr("카메라 켜기", "Camera on"), onClick: video.toggleCam },
              ]}
            />
            <div className="absolute bottom-3 left-3 flex gap-2">
              {!inPip && (
                <button className="btn bg-red-600 px-3 py-1.5 text-white" onClick={() => setConfirmEnd("human")}>
                  {tr("텍스트로 돌아가기", "Back to text")}
                </button>
              )}
              {pipButton}
            </div>
          </div>
            )}
          </PipStage>
        )}

        {/* AI practice buddy video */}
        {isAi && aiVideo.state !== "off" && (
          <PipStage fallbackVideo={() => aiPipVideo.current}>
            {(pipButton, inPip) => (
          <div className={`relative bg-slate-900 ${inPip ? "h-full" : ""}`}>
            <div className={inPip ? "h-full w-full" : "aspect-video max-h-[45vh] w-full"}>
              <AiBuddyScreen
                helloDone={aiHelloDone}
                onHelloDone={markAiHelloDone}
                name={aiKey}
                displayName={aiName}
                state={aiVideo.state}
                talking={aiTalking}
                label={tr("AI 연습 버디 · AI 생성 영상", "AI practice buddy · AI-generated video")}
                connectingText={
                  aiVideo.state === "camera"
                    ? tr("카메라를 켜는 중…", "Turning on your camera…")
                    : tr("{name} 님이 카메라를 켜는 중…", "{name} is turning on the camera…", { name: aiName })
                }
              />
            </div>
            {aiVideo.state !== "camera" && (
              <SelfTile
                stream={aiVideo.localStream}
                camOn={aiVideo.camOn}
                name={me.nickname}
                noVideoText={tr("비디오 없음", "No video")}
                videoLabel={tr("내 화면", "Your video")}
                controls={[
                  {
                    kind: "speaker",
                    on: voiceOn,
                    label: voiceOn ? tr("음성 끄기", "Voice off") : tr("음성 켜기", "Voice on"),
                    onClick: () => {
                      if (voiceOn && "speechSynthesis" in window) window.speechSynthesis.cancel();
                      setVoiceOn(!voiceOn);
                    },
                  },
                  { kind: "cam", on: aiVideo.camOn, label: aiVideo.camOn ? tr("카메라 끄기", "Camera off") : tr("카메라 켜기", "Camera on"), onClick: aiVideo.toggleCam },
                ]}
              />
            )}
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
              {!inPip && (
                <button className="btn bg-red-600 px-3 py-1.5 text-white" onClick={() => setConfirmEnd("ai")}>
                  {tr("텍스트로 돌아가기", "Back to text")}
                </button>
              )}
              {aiVideo.state === "on" && pipButton}
            </div>
          </div>
            )}
          </PipStage>
        )}
        {isAi && aiVideo.state === "on" && (
          // live copy of the buddy for browsers that only support video PiP (Safari, Android, iPhone)
          <BuddyLiveVideo
            videoRef={aiPipVideo}
            fallbackSrc={`/buddy/${aiKey}/${aiTalking ? "talk" : "idle"}.mp4`}
            talking={aiTalking}
            initial={aiName.slice(0, 1)}
          />
        )}

        {/* banners */}
        {friend === "incoming" && (
          <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-rose-100 bg-rose-50 px-4 py-3 text-sm">
            <FriendIcon done={false} />
            <span className="flex-1 text-slate-800">
              {tr("{name} 님이 친구 신청을 보냈어요.", "{name} sent you a friend request.", { name: partner.nickname })}
            </span>
            <button className="btn-ghost px-3 py-1.5" onClick={() => answerFriend(false)}>
              {tr("다음에", "Not now")}
            </button>
            <button className="btn-primary px-3 py-1.5" onClick={() => answerFriend(true)}>
              {tr("수락", "Accept")}
            </button>
          </div>
        )}
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
                  {m.image && (
                    <button
                      type="button"
                      onClick={() => setViewing(m.image!)}
                      aria-label={tr("사진 크게 보기", "View photo")}
                      className={`overflow-hidden rounded-2xl border border-slate-200 ${m.text ? "mb-1" : ""} ${mine ? "self-end rounded-br-md" : "self-start rounded-bl-md"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.image} alt={tr("보낸 사진", "Shared photo")} className="block h-auto max-h-80 w-60 max-w-full object-cover" />
                    </button>
                  )}
                  {m.text && (
                    <p
                      className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed ${
                        mine ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md bg-slate-100 text-slate-900"
                      }`}
                    >
                      {m.text}
                    </p>
                  )}
                  {tl && (
                    <div className={`mt-1 rounded-lg border border-brand-100 bg-brand-50 px-3 py-1.5 text-sm text-brand-900 ${mine ? "self-end" : ""}`}>
                      {tl.loading ? tr("번역 중…", "Translating…") : tl.text}
                      {tl.tip && <span className="mt-0.5 block text-xs text-brand-700">{tl.tip}</span>}
                    </div>
                  )}
                  {m.text ? (
                    <button
                      onClick={() => translateMessage(m)}
                      className={`mt-0.5 text-[11px] text-slate-400 hover:text-brand-600 ${mine ? "self-end" : "self-start"}`}
                    >
                      {tl?.text ? tr("번역 숨기기", "Hide translation") : tr("번역", "Translate")} ·{" "}
                      {new Date(m.ts).toLocaleTimeString(LANGS.find((l) => l.key === lang)?.locale, { hour: "numeric", minute: "2-digit" })}
                    </button>
                  ) : (
                    <span className={`mt-0.5 text-[11px] text-slate-400 ${mine ? "self-end" : "self-start"}`}>
                      {new Date(m.ts).toLocaleTimeString(LANGS.find((l) => l.key === lang)?.locale, { hour: "numeric", minute: "2-digit" })}
                    </span>
                  )}
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
          {photo && (
            <div className="mb-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt={tr("보낼 사진", "Photo to send")} className="h-16 w-16 rounded-lg object-cover" />
              <p className="min-w-0 flex-1 text-xs text-slate-500">{tr("사진은 서버에 저장되지 않고 상대에게 바로 전달돼요.", "Photos go straight to your buddy and are not stored on a server.")}</p>
              <button
                type="button"
                onClick={() => setPhoto(null)}
                aria-label={tr("사진 빼기", "Remove photo")}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-200"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <AttachButton disabled={partnerLeft} onPhoto={setPhoto} onError={addSystem} />
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
            <button className="btn-primary h-11" disabled={(!draft.trim() && !photo) || partnerLeft}>
              {tr("전송", "Send")}
            </button>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs">
            <button type="button" className="text-brand-600 hover:underline disabled:opacity-50" onClick={translateDraft} disabled={!draft.trim() || draftBusy}>
              ✦ {draftBusy ? tr("변환 중…", "Converting…") : partner.role === "korean" ? tr("한국어로 바꿔 쓰기", "Rewrite in Korean") : tr("영어로 바꿔 쓰기", "Rewrite in English")}
            </button>
            {draftError && (
              <span role="status" className="text-red-600">
                {draftError}
              </span>
            )}
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

      </aside>

      {showVideoRules && (
        <div className="fixed inset-0 z-40 grid place-items-center overscroll-contain bg-slate-900/40 p-4">
          <div role="dialog" aria-modal="true" className="card w-full max-w-sm p-6 shadow-xl">
            <p className="text-lg font-semibold">
              {isAi ? tr("{name} 님과 화상 대화를 할까요?", "Video chat with {name}?", { name: aiName }) : tr("화상 대화를 요청할까요?", "Request a video call?")}
            </p>
            {isAi ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
                <li>{tr("내 카메라를 켜면 AI 버디도 카메라를 켜요.", "Turn on your camera and the AI buddy turns on theirs too.")}</li>
                <li>{tr("AI 버디의 영상은 AI로 만든 영상이에요. 실제 사람이 아니에요.", "The buddy's video is AI-generated. It is not a real person.")}</li>
                <li>{tr("내 영상은 이 브라우저에서만 보이고 전송·녹화되지 않아요.", "Your video stays in this browser. It is never sent or recorded.")}</li>
              </ul>
            ) : (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
                <li>{tr("상대가 수락해야만 화상이 시작돼요.", "Video starts only if your buddy accepts.")}</li>
                <li>{tr("영상은 서로의 브라우저 사이에서 직접 전송되고 녹화·저장되지 않아요.", "Video goes directly between your browsers and is never recorded.")}</li>
                <li>{tr("불편하면 언제든 '텍스트로 돌아가기'를 누르세요.", "Feel uncomfortable? Press 'Back to text' anytime.")}</li>
              </ul>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button className="btn-ghost" onClick={() => setShowVideoRules(false)}>
                {tr("취소", "Cancel")}
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  setShowVideoRules(false);
                  if (isAi) aiVideo.start(() => askAiBuddy(messagesRef.current, "video-on"));
                  else video.request();
                }}
              >
                {isAi ? tr("내 카메라 켜기", "Turn on my camera") : tr("요청 보내기", "Send request")}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewing && <PhotoViewer src={viewing} onClose={() => setViewing(null)} />}

      {confirmEnd && (
        <div className="fixed inset-0 z-40 grid place-items-center overscroll-contain bg-slate-900/50 p-4" onClick={() => setConfirmEnd(null)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="end-title" className="card w-full max-w-sm p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p id="end-title" className="text-lg font-semibold">
              {confirmEnd === "leave" ? tr("채팅방을 나갈까요?", "Leave this chat?") : tr("화상 대화를 종료할까요?", "End the video call?")}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {confirmEnd === "leave"
                ? tr("나가면 이 대화가 종료되고 로비로 돌아가요.", "The chat ends and you go back to the lobby.")
                : tr("화상만 종료되고, 텍스트 채팅은 계속 이어져요.", "Only the video ends. Your text chat continues.")}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button className="btn-ghost" autoFocus onClick={() => setConfirmEnd(null)}>
                {tr("취소", "Cancel")}
              </button>
              <button
                className="btn bg-red-600 text-white hover:bg-red-700"
                onClick={() => {
                  if (confirmEnd === "leave") leave();
                  else if (confirmEnd === "ai") stopAiVideo();
                  else video.end();
                  setConfirmEnd(null);
                }}
              >
                {confirmEnd === "leave" ? tr("나가기", "Leave") : tr("화상 종료", "End video")}
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

function VideoEl({ stream, muted, className, label, pipSource }: { stream: MediaStream; muted?: boolean; className?: string; label: string; pipSource?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} aria-label={label} className={className} data-pip-source={pipSource ? "" : undefined} />;
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

/** Ask the server to translate, giving up after 15 seconds so the button never hangs. */
async function translateText(text: string, target: string): Promise<{ text: string | null; tip?: string; error?: string }> {
  try {
    const res = await fetch("/api/ai/translate", { method: "POST", body: JSON.stringify({ text, target }), signal: AbortSignal.timeout(15000) });
    return await res.json();
  } catch {
    return { text: null, error: "timeout" };
  }
}

/** How long the AI buddy "types": about 3–5 s for a short reply, up to 8–10 s for a long one. */
function replyDelay(text: string) {
  const t = Math.min(1, Math.max(0, (text.length - 15) / 105)); // 15 chars or less = short, 120+ = long
  const base = 3000 + t * 5000; // 3 s .. 8 s
  return base + Math.random() * 2000; // plus 0–2 s so it doesn't feel mechanical
}

function FriendIcon({ done }: { done: boolean }) {
  return done ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.3 5 6.8 5c2 0 3.4 1.1 4.2 2.4h2C13.8 6.1 15.2 5 17.2 5c3.5 0 5.6 3.6 4.3 6.8C19.5 16.4 12 21 12 21z" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1" />
      <path d="M19 8v6M16 11h6" />
    </svg>
  );
}
