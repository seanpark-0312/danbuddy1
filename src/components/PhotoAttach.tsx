"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";

/**
 * Photo sharing for the chat, like the "+" button in messaging apps.
 * Photos are shrunk in the browser and sent straight to the buddy over the realtime channel.
 * Nothing is uploaded or stored on a server.
 */

// Realtime broadcast messages must stay small, so keep each photo under about 180 KB.
const MAX_SIDE = 1280;
const MAX_CHARS = 240_000;

/** Shrink an image (file or canvas) to a JPEG data URL small enough to send. */
export async function compressImage(src: Blob | HTMLCanvasElement): Promise<string> {
  let canvas: HTMLCanvasElement;
  if (src instanceof HTMLCanvasElement) canvas = src;
  else {
    const bmp = await loadBitmap(src);
    canvas = document.createElement("canvas");
    const s = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    canvas.width = Math.round(bmp.width * s);
    canvas.height = Math.round(bmp.height * s);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff"; // transparent PNGs become white, not black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  }
  let q = 0.8;
  let url = canvas.toDataURL("image/jpeg", q);
  while (url.length > MAX_CHARS) {
    if (q > 0.45) q -= 0.1;
    else {
      const half = document.createElement("canvas");
      half.width = Math.round(canvas.width * 0.75);
      half.height = Math.round(canvas.height * 0.75);
      half.getContext("2d")!.drawImage(canvas, 0, 0, half.width, half.height);
      canvas = half;
    }
    url = canvas.toDataURL("image/jpeg", q);
  }
  return url;
}

async function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    // respects the photo's EXIF rotation on modern browsers
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/** The "+" button with its menu: photo library or camera. */
export function AttachButton({ disabled, onPhoto, onError }: { disabled?: boolean; onPhoto: (dataUrl: string) => void; onError: (msg: string) => void }) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const [camera, setCamera] = useState(false);
  const library = useRef<HTMLInputElement>(null);
  const capture = useRef<HTMLInputElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  async function fromFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      onPhoto(await compressImage(f));
    } catch {
      onError(tr("이 사진은 열 수 없어요. 다른 사진을 골라 주세요.", "Couldn't open this photo. Try another one."));
    }
  }

  function openCamera() {
    setOpen(false);
    // in-app camera asks for permission; without camera support use the phone's camera app
    if (typeof navigator.mediaDevices?.getUserMedia === "function") setCamera(true);
    else capture.current?.click();
  }

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-label={tr("사진 보내기", "Send a photo")}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-40 ${
          open ? "bg-brand-50 text-brand-700" : "bg-white"
        }`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className={`transition ${open ? "rotate-45" : ""}`}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute bottom-full left-0 z-20 mb-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <MenuItem
            icon={
              <>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-5-5L5 21" />
              </>
            }
            label={tr("앨범에서 선택", "Photo library")}
            onClick={() => {
              setOpen(false);
              library.current?.click();
            }}
          />
          <MenuItem
            icon={
              <>
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
                <circle cx="12" cy="13" r="3" />
              </>
            }
            label={tr("카메라로 촬영", "Take a photo")}
            onClick={openCamera}
          />
        </div>
      )}
      <input ref={library} type="file" accept="image/*" className="hidden" onChange={fromFile} />
      <input ref={capture} type="file" accept="image/*" capture="environment" className="hidden" onChange={fromFile} />
      {camera && (
        <CameraSheet
          onClose={() => setCamera(false)}
          onShot={(url) => {
            setCamera(false);
            onPhoto(url);
          }}
          onDenied={() => {
            setCamera(false);
            onError(tr("카메라를 열 수 없어요. 브라우저 설정에서 카메라 권한을 허용해 주세요.", "Couldn't open the camera. Allow camera access in your browser settings."));
          }}
        />
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm text-slate-800 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-brand-600">
        {icon}
      </svg>
      {label}
    </button>
  );
}

/** Full-screen in-app camera. The browser shows its camera permission prompt when it opens. */
function CameraSheet({ onClose, onShot, onDenied }: { onClose: () => void; onShot: (url: string) => void; onDenied: () => void }) {
  const tr = useT();
  const video = useRef<HTMLVideoElement>(null);
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [ready, setReady] = useState(false);
  const [canSwitch, setCanSwitch] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let alive = true;
    setReady(false);
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then(async (s) => {
        if (!alive) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
          await video.current.play().catch(() => {});
        }
        setReady(true);
        const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
        if (alive) setCanSwitch(cams.length > 1);
      })
      .catch(() => alive && onDenied());
    return () => {
      alive = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);

  async function shoot() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const s = Math.min(1, MAX_SIDE / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(v.videoWidth * s);
    c.height = Math.round(v.videoHeight * s);
    const ctx = c.getContext("2d")!;
    if (facing === "user") {
      // match the mirrored preview, like a selfie camera
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0, c.width, c.height);
    onShot(await compressImage(c));
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={tr("카메라로 촬영", "Take a photo")} className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="relative min-h-0 flex-1">
        <video ref={video} playsInline muted className={`h-full w-full object-contain ${facing === "user" ? "-scale-x-100" : ""}`} />
        {!ready && (
          <p className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-slate-300">
            {tr("카메라 권한을 허용해 주세요…", "Allow camera access to continue…")}
          </p>
        )}
      </div>
      <div className="grid grid-cols-3 items-center px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
        <button type="button" onClick={onClose} className="justify-self-start rounded-full px-3 py-2 text-sm font-medium text-white hover:bg-white/10">
          {tr("취소", "Cancel")}
        </button>
        <button
          type="button"
          onClick={shoot}
          disabled={!ready}
          aria-label={tr("촬영", "Take photo")}
          className="h-16 w-16 justify-self-center rounded-full border-4 border-white bg-white/20 transition active:scale-95 disabled:opacity-40"
        />
        {canSwitch ? (
          <button
            type="button"
            onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
            aria-label={tr("카메라 전환", "Switch camera")}
            className="grid h-11 w-11 place-items-center justify-self-end rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5" />
            </svg>
          </button>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

/** Tap a photo in the chat to see it full screen. */
export function PhotoViewer({ src, onClose }: { src: string; onClose: () => void }) {
  const tr = useT();
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label={tr("사진", "Photo")} className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4" onClick={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
      <button type="button" onClick={onClose} aria-label={tr("닫기", "Close")} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
