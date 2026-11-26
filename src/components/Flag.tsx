/**
 * Country flags drawn as SVG. Flag emoji show up as two letters ("JP", "ES") on Windows,
 * which has no flag glyphs, so the AI buddy cards draw the flags themselves.
 */
export type FlagCode = "fr" | "jp" | "es" | "kr";

function Trigram({ bars, x, y, angle }: { bars: [boolean, boolean, boolean]; x: number; y: number; angle: number }) {
  // each bar: true = solid, false = broken; 12 x 2 units, 1 unit apart
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`} fill="#000">
      {bars.map((solid, i) => {
        const yy = -4 + i * 3;
        return solid ? (
          <rect key={i} x={-6} y={yy} width={12} height={2} />
        ) : (
          <g key={i}>
            <rect x={-6} y={yy} width={5.5} height={2} />
            <rect x={0.5} y={yy} width={5.5} height={2} />
          </g>
        );
      })}
    </g>
  );
}

function Shape({ code }: { code: FlagCode }) {
  switch (code) {
    case "fr":
      return (
        <>
          <rect width={60} height={40} fill="#fff" />
          <rect width={20} height={40} fill="#002395" />
          <rect x={40} width={20} height={40} fill="#ed2939" />
        </>
      );
    case "jp":
      return (
        <>
          <rect width={60} height={40} fill="#fff" />
          <circle cx={30} cy={20} r={12} fill="#bc002d" />
        </>
      );
    case "es":
      return (
        <>
          <rect width={60} height={40} fill="#aa151b" />
          <rect y={10} width={60} height={20} fill="#f1bf00" />
        </>
      );
    case "kr":
      return (
        <>
          <rect width={60} height={40} fill="#fff" />
          <g transform="translate(30 20) rotate(33.69)">
            <circle r={10} fill="#0047a0" />
            <path d="M-10 0a10 10 0 0 1 20 0a5 5 0 0 1-10 0a5 5 0 0 0-10 0z" transform="scale(-1 1)" fill="#cd2e3a" />
          </g>
          <Trigram bars={[true, true, true]} x={13} y={8.5} angle={-33.69} />
          <Trigram bars={[false, false, false]} x={47} y={31.5} angle={-33.69} />
          <Trigram bars={[true, false, true]} x={13} y={31.5} angle={33.69} />
          <Trigram bars={[false, true, false]} x={47} y={8.5} angle={33.69} />
        </>
      );
  }
}

export function Flag({ code, className }: { code: FlagCode; className?: string }) {
  return (
    <svg viewBox="0 0 60 40" className={className} aria-hidden>
      <Shape code={code} />
      <rect width={60} height={40} fill="none" stroke="rgba(15,23,42,.12)" strokeWidth={1} />
    </svg>
  );
}
