"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Video call with the AI practice buddy.
 * The judge's own camera stays in the browser (never sent anywhere). The buddy side plays
 * pre-generated clips from /public/buddy/<name>/: hello.mp4 (once), idle.mp4 (loop while listening)
 * and talk.mp4 (loop while speaking). Missing clips fall back to an animated placeholder.
 */
export type AiVideoState = "off" | "camera" | "connecting" | "on";

export function useAiVideo(onError: (key: string) => void) {
  const [state, setState] = useState<AiVideoState>("off");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [camOn, setCamOn] = useState(true);
  const stream = useRef<MediaStream | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stop = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setLocalStream(null);
    setState("off");
  }, []);

  useEffect(() => stop, [stop]);

  /** Judge turns on the camera -> buddy "turns on" hers a moment later. */
  const start = useCallback(
    async (onConnected: () => void) => {
      setState("camera");
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        stream.current = s;
        setLocalStream(s);
        setCamOn(true);
        setState("connecting");
        timers.current.push(
          setTimeout(() => {
            setState("on");
            onConnected();
          }, 1800),
        );
      } catch {
        setState("off");
        onError("camera-error");
      }
    },
    [onError],
  );

  const toggleCam = useCallback(() => {
    const track = stream.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  }, []);

  return { state, localStream, camOn, start, stop, toggleCam };
}

type Media = "clips" | "still" | "none" | null;

/** Which media exist for this buddy: video clips, a single still photo, or nothing. */
function useBuddyMedia(name: string): Media {
  const [media, setMedia] = useState<Media>(null);
  useEffect(() => {
    let alive = true;
    const has = (f: string) =>
      fetch(`/buddy/${name}/${f}`, { method: "HEAD" })
        .then((r) => r.ok)
        .catch(() => false);
    (async () => {
      const m: Media = (await has("idle.mp4")) ? "clips" : (await has("still.jpg")) ? "still" : "none";
      if (alive) setMedia(m);
    })();
    return () => {
      alive = false;
    };
  }, [name]);
  return media;
}

export function AiBuddyScreen({
  name,
  displayName,
  state,
  talking,
  caption,
  label,
  connectingText,
}: {
  name: string;
  displayName: string;
  state: AiVideoState;
  talking: boolean;
  caption: string | null;
  label: string;
  connectingText: string;
}) {
  const media = useBuddyMedia(name);
  const clips = media === "clips";
  const [helloDone, setHelloDone] = useState(false);
  const idle = useRef<HTMLVideoElement>(null);
  const talk = useRef<HTMLVideoElement>(null);
  const hello = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (state !== "on") setHelloDone(false);
  }, [state]);

  // keep the clips playing; switch which one is visible
  useEffect(() => {
    if (state !== "on" || !clips) return;
    idle.current?.play().catch(() => {});
    if (!helloDone) hello.current?.play().catch(() => setHelloDone(true));
    if (talking) {
      if (talk.current && talk.current.paused) {
        talk.current.currentTime = 0;
        talk.current.play().catch(() => {});
      }
    }
  }, [state, clips, talking, helloDone]);

  const base = `/buddy/${name}`;
  const show = state === "on";
  const layer = "absolute inset-0 h-full w-full object-cover transition-opacity duration-300";

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-900">
      {show && clips && (
        <>
          <video ref={idle} src={`${base}/idle.mp4`} muted loop playsInline preload="auto" className={layer} aria-hidden />
          <video
            ref={talk}
            src={`${base}/talk.mp4`}
            muted
            loop
            playsInline
            preload="auto"
            className={`${layer} ${talking && helloDone ? "opacity-100" : "opacity-0"}`}
            aria-hidden
          />
          {!helloDone && (
            <video
              ref={hello}
              src={`${base}/hello.mp4`}
              muted
              playsInline
              preload="auto"
              onEnded={() => setHelloDone(true)}
              onError={() => setHelloDone(true)}
              className={layer}
              aria-hidden
            />
          )}
        </>
      )}
      {show && media === "still" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`${base}/still.jpg`} alt="" aria-hidden className={`${layer} buddy-still ${talking ? "buddy-talking" : ""}`} />
      )}
      {show && media === "none" && <Placeholder name={displayName} talking={talking} />}
      {show && talking && media !== "none" && (
        <span className="absolute right-3 top-3 flex h-6 items-end gap-0.5 rounded-full bg-slate-900/60 px-2 py-1.5" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="buddy-bar w-1 rounded-full bg-white" style={{ animationDelay: `${i * 120}ms` }} />
          ))}
        </span>
      )}
      {!show && (
        <div className="grid h-full place-items-center text-sm text-slate-300">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand-300" />
            {connectingText}
          </span>
        </div>
      )}
      {show && (
        <span className="absolute left-3 top-3 rounded-full bg-slate-900/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
          {displayName} · {label}
        </span>
      )}
      {show && caption && (
        <p className="absolute bottom-14 left-3 right-32 mx-auto max-w-xl rounded-lg sm:right-48 bg-slate-900/70 px-3 py-1.5 text-center text-sm leading-snug text-white backdrop-blur sm:bottom-16">
          {caption}
        </p>
      )}
    </div>
  );
}

function Placeholder({ name, talking }: { name: string; talking: boolean }) {
  return (
    <div className="grid h-full place-items-center bg-gradient-to-b from-brand-700 to-brand-900">
      <div className="relative grid place-items-center">
        <span className={`absolute h-36 w-36 rounded-full bg-brand-400/30 ${talking ? "animate-ping" : ""}`} />
        <span className="relative grid h-28 w-28 place-items-center rounded-full bg-white text-4xl font-bold text-brand-700">{name.slice(0, 1)}</span>
      </div>
    </div>
  );
}

/** Speak a line with the browser's built-in voice. Resolves when finished (or right away if unsupported). */
export function speak(text: string, enabled: boolean): Promise<void> {
  // talking time if there is no voice: roughly reading speed, 2.5 to 12 seconds
  const readMs = Math.min(12000, Math.max(2500, text.length * 70));
  return new Promise((resolve) => {
    const started = Date.now();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    const finishAfterReading = () => setTimeout(finish, Math.max(0, readMs - (Date.now() - started)));
    if (!enabled || typeof window === "undefined" || !("speechSynthesis" in window)) return finishAfterReading();
    const hangul = /[\uac00-\ud7a3]/.test(text);
    const lang = hangul ? "ko-KR" : "en-US";
    const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.replace("_", "-").startsWith(lang.slice(0, 2)));
    if (!voices.length) return finishAfterReading();
    const u = new SpeechSynthesisUtterance(text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ""));
    u.lang = lang;
    const female = voices.find((v) => /female|samantha|karen|zira|aria|jenny|google us english|yuna|sora|heami|sun-hi/i.test(v.name));
    u.voice = female ?? voices[0];
    u.pitch = 1.1;
    u.onend = () => (Date.now() - started < 800 ? finishAfterReading() : finish());
    u.onerror = finishAfterReading;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setTimeout(finish, 20000);
  });
}
