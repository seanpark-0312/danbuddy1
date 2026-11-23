"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/lib/i18n";

/**
 * Picture-in-picture for the video call, so people can browse other tabs while they talk.
 * - Chrome / Edge on a computer: Document PiP. The whole call screen (buddy video, my video and
 *   the buttons) moves into a small always-on-top window.
 * - Safari, Android Chrome and others: the browser's video PiP with the buddy's video only.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow(opts?: { width?: number; height?: number }): Promise<Window>;
      window: Window | null;
    };
  }
}

type Mode = "document" | "video" | null;

export function pipSupport(): Mode {
  if (typeof window === "undefined") return null;
  if (window.documentPictureInPicture && !/Android|iPhone|iPad/i.test(navigator.userAgent)) return "document";
  const v = document.createElement("video") as any;
  if (document.pictureInPictureEnabled || typeof v.webkitSetPresentationMode === "function") return "video";
  return null;
}

async function videoPip(v: HTMLVideoElement) {
  const w = v as any;
  if (document.pictureInPictureEnabled && v.requestPictureInPicture) {
    if (v.readyState < 1) await new Promise((r) => v.addEventListener("loadedmetadata", r, { once: true }));
    await v.requestPictureInPicture();
  } else if (typeof w.webkitSetPresentationMode === "function") {
    w.webkitSetPresentationMode("picture-in-picture");
  }
}

function copyStyles(to: Document) {
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const style = to.createElement("style");
      style.textContent = Array.from(sheet.cssRules)
        .map((r) => r.cssText)
        .join("\n");
      to.head.appendChild(style);
    } catch {
      if (sheet.href) {
        const link = to.createElement("link");
        link.rel = "stylesheet";
        link.href = sheet.href;
        to.head.appendChild(link);
      }
    }
  }
}

/**
 * Wraps the call screen. `fallbackVideo` returns the <video> to use when only video PiP is available.
 * `children` gets a PiP button to place wherever it fits.
 */
export function PipStage({
  fallbackVideo,
  children,
}: {
  fallbackVideo: () => HTMLVideoElement | null;
  children: (pipButton: ReactNode, inPip: boolean) => ReactNode;
}) {
  const tr = useT();
  const [mode, setMode] = useState<Mode>(null);
  const [win, setWin] = useState<Window | null>(null);
  const [videoPipOn, setVideoPipOn] = useState(false);
  const [error, setError] = useState(false);
  const host = useRef<HTMLElement | null>(null);

  useEffect(() => setMode(pipSupport()), []);

  // leaving the page or ending the call closes the small window
  useEffect(
    () => () => {
      window.documentPictureInPicture?.window?.close();
      if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
    },
    [],
  );

  // the browser's own PiP can be closed from its window; keep the button state in sync
  useEffect(() => {
    if (mode !== "video") return;
    const on = () => setVideoPipOn(!!document.pictureInPictureElement);
    document.addEventListener("enterpictureinpicture", on, true);
    document.addEventListener("leavepictureinpicture", on, true);
    return () => {
      document.removeEventListener("enterpictureinpicture", on, true);
      document.removeEventListener("leavepictureinpicture", on, true);
    };
  }, [mode]);

  const open = useCallback(async () => {
    setError(false);
    try {
      if (mode === "document" && window.documentPictureInPicture) {
        const w = await window.documentPictureInPicture.requestWindow({
          width: 480,
          height: 300,
        });
        copyStyles(w.document);
        w.document.title = "DanBuddy";
        w.document.body.style.margin = "0";
        w.document.body.style.background = "#0f172a";
        const div = w.document.createElement("div");
        div.style.height = "100vh";
        w.document.body.appendChild(div);
        host.current = div;
        w.addEventListener("pagehide", () => {
          host.current = null;
          setWin(null);
        });
        setWin(w);
      } else {
        const v = fallbackVideo();
        if (!v) throw new Error("no video");
        await videoPip(v);
      }
    } catch {
      setError(true);
    }
  }, [mode, fallbackVideo]);

  const close = useCallback(() => {
    win?.close();
    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
  }, [win]);

  const active = !!win || videoPipOn;
  const button = mode ? (
    <button
      type="button"
      onClick={active ? close : open}
      aria-pressed={active}
      aria-label={active ? tr("작은 창 닫기", "Close small window") : tr("작은 창으로 보기", "Pop out")}
      title={error ? tr("이 브라우저에서는 작은 창을 열 수 없어요.", "This browser can't open a small window.") : undefined}
      className="btn bg-slate-900/70 px-3 py-1.5 text-white backdrop-blur hover:bg-slate-900"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <rect x="12" y="11" width="7" height="6" rx="1" fill="currentColor" />
      </svg>
      <span className="hidden sm:inline">{active ? tr("작은 창 닫기", "Close small window") : tr("작은 창으로 보기", "Pop out")}</span>
    </button>
  ) : null;

  if (win && host.current) {
    return (
      <>
        <div className="grid aspect-video max-h-[45vh] w-full place-items-center bg-slate-900 text-sm text-slate-300">
          <div className="flex flex-col items-center gap-3 px-4 text-center">
            <p>
              {tr(
                "화상 화면을 작은 창으로 보고 있어요. 다른 탭을 써도 계속 보여요.",
                "The call is in a small window. It stays on top while you use other tabs.",
              )}
            </p>
            <button type="button" className="btn bg-white px-3 py-1.5 text-slate-900" onClick={close}>
              {tr("이 화면으로 돌아오기", "Bring it back here")}
            </button>
          </div>
        </div>
        {createPortal(children(button, true), host.current)}
      </>
    );
  }
  return <>{children(button, false)}</>;
}
