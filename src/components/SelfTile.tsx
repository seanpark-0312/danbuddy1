"use client";
import { useEffect, useRef } from "react";

export interface TileControl {
  kind: "mic" | "cam" | "speaker";
  on: boolean;
  label: string;
  onClick: () => void;
}

/**
 * My own camera view in a call, like Meet or Zoom: the tile stays when the camera is off
 * (shows my initial and "no video"), and the mic / camera toggles sit inside the tile as icons.
 */
export function SelfTile({
  stream,
  camOn,
  name,
  noVideoText,
  videoLabel,
  controls,
}: {
  stream: MediaStream | null;
  camOn: boolean;
  name: string;
  noVideoText: string;
  videoLabel: string;
  controls: TileControl[];
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream, camOn]);

  return (
    <div className="absolute bottom-3 right-3 aspect-video w-40 overflow-hidden rounded-lg border border-white/30 bg-slate-800 shadow-lg sm:w-56">
      {stream && camOn ? (
        <video ref={ref} autoPlay playsInline muted aria-label={videoLabel} className="h-full w-full -scale-x-100 object-cover" />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-1 pb-7 text-slate-300">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white sm:h-11 sm:w-11 sm:text-base">
            {name.trim().slice(0, 1).toUpperCase() || "?"}
          </span>
          <span className="text-[11px] sm:text-xs">{noVideoText}</span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 bg-gradient-to-t from-slate-900/80 to-transparent px-2 pb-1.5 pt-4">
        {controls.map((c) => (
          <button
            key={c.kind}
            type="button"
            onClick={c.onClick}
            aria-label={c.label}
            aria-pressed={!c.on}
            title={c.label}
            className={`grid h-8 w-8 place-items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              c.on ? "bg-slate-900/70 text-white hover:bg-slate-900" : "bg-red-600 text-white hover:bg-red-700"
            }`}
          >
            <Icon kind={c.kind} off={!c.on} />
          </button>
        ))}
      </div>
    </div>
  );
}

function Icon({ kind, off }: { kind: TileControl["kind"]; off: boolean }) {
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  return (
    <svg {...common}>
      {kind === "mic" && (
        <>
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" />
        </>
      )}
      {kind === "cam" && (
        <>
          <path d="m22 8-6 4 6 4V8Z" />
          <rect x="2" y="6" width="14" height="12" rx="2" />
        </>
      )}
      {kind === "speaker" && (
        <>
          <path d="M11 5 6 9H2v6h4l5 4V5Z" />
          {!off && <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />}
        </>
      )}
      {off && <path d="M3 3l18 18" />}
    </svg>
  );
}
