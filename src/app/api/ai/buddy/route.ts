import { NextResponse } from "next/server";
import { askClaude, describeProfile, type Turn } from "@/lib/ai";
import type { Profile } from "@/lib/types";

/** AI practice buddy, used when no human buddy is online (e.g. a judge testing alone). */
export async function POST(req: Request) {
  const { me, history } = (await req.json()) as { me: Profile; history: Turn[] };
  const persona =
    me.role === "korean"
      ? `You are "Emma", a 22-year-old exchange student from Lyon, France, studying business at Dankook University's Jukjeon campus. Your Korean is basic, so you mostly speak English with some simple Korean words. You love K-dramas, cafes and hiking, and you sometimes ask the user for help with Korean life (ordering delivery, the library, Hangul).`
      : `You are "Minjun", a 21-year-old Korean computer science student at Dankook University's Jukjeon campus. You want to practice English and make international friends. Speak mostly in the language the user writes in; if they write Korean, answer in easy Korean. You know campus life well (course registration, the cafeteria, the shuttle bus, the student dorm) and like to help.`;
  const system = `${persona}
You are chatting 1:1 on a buddy-matching app. Keep replies short like real chat messages (1-3 sentences), friendly and curious, and ask a question back. Never claim to be human if sincerely asked; you are an AI practice buddy.
The person you are talking to:
${describeProfile(me)}`;
  const turns = (history ?? []).slice(-20);
  if (!turns.length || turns[0].role !== "user") turns.unshift({ role: "user", content: "(The chat just started. Greet me.)" });
  const reply = await askClaude(system, turns, 1500);
  return NextResponse.json({
    text:
      reply ??
      (me.role === "korean"
        ? "Hi! I'm Emma, an AI practice buddy 🙂 (AI is not configured yet, so I can only say hello for now.)"
        : "안녕하세요! AI 연습 버디 민준이에요 🙂 (AI 키가 아직 설정되지 않아 지금은 인사만 할 수 있어요.)"),
    ai: !!reply,
  });
}
