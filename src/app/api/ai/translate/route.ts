import { NextResponse } from "next/server";
import { askClaude, parseJson } from "@/lib/ai";

const NAMES: Record<string, string> = { ko: "Korean", en: "English", zh: "Chinese", ja: "Japanese", vi: "Vietnamese" };

export async function POST(req: Request) {
  const { text, target } = (await req.json()) as { text: string; target: string };
  if (!text?.trim()) return NextResponse.json({ text: "" });
  const lang = NAMES[target] ?? "English";
  const system = `Translate the user's chat message into natural, casual ${lang} as a university student would say it. Keep emojis. If it is already in ${lang}, lightly correct it instead.
After the translation, add one short learning tip in parentheses only if there is an expression worth learning (slang, idiom, honorific). Reply with JSON only: {"text":"...","tip":"..." }`;
  const parsed = parseJson<{ text: string; tip?: string }>(
    await askClaude(system, [{ role: "user", content: text.slice(0, 1000) }], 1500),
  );
  if (!parsed) return NextResponse.json({ text: null, ai: false });
  return NextResponse.json({ text: parsed.text, tip: parsed.tip || "", ai: true });
}
