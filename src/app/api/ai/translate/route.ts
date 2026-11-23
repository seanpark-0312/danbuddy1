import { NextResponse } from "next/server";
import { LANG_NAMES, callAI, parseJson } from "@/lib/ai";

export async function POST(req: Request) {
  const { text, target } = (await req.json()) as { text: string; target: string };
  if (!text?.trim()) return NextResponse.json({ text: "" });
  const lang = LANG_NAMES[target] ?? "English";
  const system = `Translate the user's chat message into natural, casual ${lang} as a university student would say it. Keep emojis. If it is already in ${lang}, lightly correct it instead.
After the translation, add one short learning tip in parentheses only if there is an expression worth learning (slang, idiom, honorific). Reply with JSON only: {"text":"...","tip":"..." }`;
  const r = await callAI(system, [{ role: "user", content: text.slice(0, 1000) }], 1500, 12000);
  const parsed = parseJson<{ text: string; tip?: string }>(r.text);
  if (!parsed) return NextResponse.json({ text: null, ai: false, error: r.error ?? "api" });
  return NextResponse.json({ text: parsed.text, tip: parsed.tip || "", ai: true });
}
