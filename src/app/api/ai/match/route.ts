import { NextResponse } from "next/server";
import { LANG_NAMES, askAI, describeProfile, parseJson } from "@/lib/ai";
import type { Profile } from "@/lib/types";

export async function POST(req: Request) {
  const { me, candidates, lang } = (await req.json()) as { me: Profile; candidates: Profile[]; lang: string };
  const list = candidates.slice(0, 8);
  if (!list.length) return NextResponse.json({ results: [] });

  const system = `You are the matchmaker of a campus buddy program at Dankook University that connects Korean students with international students.
For each candidate, judge how well they fit the user (mutual help, language exchange, shared interests) and write one warm, specific sentence explaining why they would be good buddies, plus one icebreaker question the user could open with.
Write the reason and icebreaker in ${LANG_NAMES[lang] ?? "English"}.
Reply with JSON only: {"results":[{"id":"...","score":0-100,"reason":"...","icebreaker":"..."}]}`;
  const user = `USER\n${describeProfile(me)}\n\nCANDIDATES\n${list
    .map((c) => `id: ${c.id}\n${describeProfile(c)}`)
    .join("\n---\n")}`;

  const parsed = parseJson<{ results: { id: string; score: number; reason: string; icebreaker: string }[] }>(
    await askAI(system, [{ role: "user", content: user }], 3000),
  );
  if (!parsed) return NextResponse.json({ results: [], ai: false });
  return NextResponse.json({ results: parsed.results, ai: true });
}
