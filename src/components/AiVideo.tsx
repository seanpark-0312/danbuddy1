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
  label,
  connectingText,
  helloDone: helloDoneProp,
  onHelloDone,
}: {
  name: string;
  displayName: string;
  state: AiVideoState;
  talking: boolean;
  label: string;
  connectingText: string;
  /** optional: keep "hello played" outside, so moving the screen into a PiP window doesn't replay it */
  helloDone?: boolean;
  onHelloDone?: () => void;
}) {
  const media = useBuddyMedia(name);
  const clips = media === "clips";
  const [helloDoneLocal, setHelloDoneLocal] = useState(false);
  const helloDone = helloDoneProp ?? helloDoneLocal;
  const setHelloDone = useCallback(
    (v: boolean) => {
      setHelloDoneLocal(v);
      if (v) onHelloDone?.();
    },
    [onHelloDone],
  );
  const idle = useRef<HTMLVideoElement>(null);
  const talk = useRef<HTMLVideoElement>(null);
  const hello = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (state !== "on") setHelloDone(false);
  }, [state, setHelloDone]);

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
  }, [state, clips, talking, helloDone, setHelloDone]);

  const base = `/buddy/${name}`;
  const show = state === "on";
  const layer = "absolute inset-0 h-full w-full object-cover transition-opacity duration-300";

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-900">
      {show && clips && (
        <>
          <video ref={idle} data-buddy-clip="idle" src={`${base}/idle.mp4`} muted loop playsInline preload="auto" className={layer} aria-hidden />
          <video
            ref={talk}
            data-buddy-clip="talk"
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
              data-buddy-clip="hello"
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
        <img data-buddy-clip="still" src={`${base}/still.jpg`} alt="" aria-hidden className={layer} />
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
    </div>
  );
}

/**
 * Hidden <video> for browsers that only have the plain video PiP (Safari, Android, iPhone).
 * Instead of pointing it at the mp4 (which shows a seek bar and looks like a recording), it plays
 * a live stream drawn from whichever buddy clip is on screen, so the PiP window looks like a call.
 * A worker drives the drawing because page timers slow down while the user is in another tab.
 */
export function BuddyLiveVideo({
  videoRef,
  fallbackSrc,
  talking,
  initial,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  fallbackSrc: string;
  talking: boolean;
  initial: string;
}) {
  const talkingRef = useRef(talking);
  talkingRef.current = talking;
  const [live, setLive] = useState(true);

  useEffect(() => {
    const canvas = document.createElement("canvas") as HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream };
    canvas.width = 960;
    canvas.height = 540;
    const ctx = canvas.getContext("2d");
    if (!ctx || typeof canvas.captureStream !== "function") {
      setLive(false);
      return;
    }
    const stream = canvas.captureStream(24);
    const v = videoRef.current;
    if (v) {
      v.srcObject = stream;
      v.play().catch(() => {});
    }
    const pick = () => {
      const q = (k: string) => document.querySelector<HTMLVideoElement | HTMLImageElement>(`[data-buddy-clip="${k}"]`);
      return q("hello") ?? (talkingRef.current ? q("talk") : null) ?? q("idle") ?? q("still");
    };
    const draw = () => {
      const el = pick();
      if (el instanceof HTMLVideoElement) {
        if (el.paused) el.play().catch(() => {});
        if (el.readyState >= 2) {
          // same "cover" crop as the screen
          const w = el.videoWidth || 16, h = el.videoHeight || 9;
          const scale = Math.max(canvas.width / w, canvas.height / h);
          ctx.drawImage(el, (canvas.width - w * scale) / 2, (canvas.height - h * scale) / 2, w * scale, h * scale);
          return;
        }
      } else if (el instanceof HTMLImageElement && el.complete && el.naturalWidth) {
        const w = el.naturalWidth, h = el.naturalHeight;
        const scale = Math.max(canvas.width / w, canvas.height / h);
        ctx.drawImage(el, (canvas.width - w * scale) / 2, (canvas.height - h * scale) / 2, w * scale, h * scale);
        return;
      }
      ctx.fillStyle = "#1e1b4b";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 120px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initial, canvas.width / 2, canvas.height / 2);
    };
    draw();
    let worker: Worker | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    try {
      const url = URL.createObjectURL(new Blob(["setInterval(()=>postMessage(0),42)"], { type: "text/javascript" }));
      worker = new Worker(url);
      URL.revokeObjectURL(url);
      worker.onmessage = draw;
    } catch {
      timer = setInterval(draw, 42);
    }
    return () => {
      worker?.terminate();
      if (timer) clearInterval(timer);
      stream.getTracks().forEach((t) => t.stop());
      if (v && v.srcObject === stream) v.srcObject = null;
    };
  }, [videoRef, initial]);

  return (
    <video
      ref={videoRef}
      src={live ? undefined : fallbackSrc}
      muted
      loop={!live}
      autoPlay
      playsInline
      aria-hidden
      className="pointer-events-none fixed bottom-0 left-0 h-px w-px opacity-0"
    />
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
