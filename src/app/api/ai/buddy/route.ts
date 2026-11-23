import { NextResponse } from "next/server";
import { askAI, describeProfile, type Turn } from "@/lib/ai";
import type { Profile } from "@/lib/types";
import { fallbackReply } from "@/lib/buddyFallback";

/** AI practice buddy, used when no human buddy is online (e.g. a judge testing alone). */
export async function POST(req: Request) {
  const { me, history, event } = (await req.json()) as { me: Profile; history: Turn[]; event?: "video-on" | "friend" };
  const persona =
    me.role === "korean"
      ? `You are "Emma", a 22-year-old exchange student from Lyon, France, studying business at Dankook University's Jukjeon campus. Your Korean is basic, so you mostly speak English with some simple Korean words. You love K-dramas, cafes and hiking, and you sometimes ask the user for help with Korean life (ordering delivery, the library, Hangul).`
      : `You are "Minjun", a 21-year-old Korean computer science student at Dankook University's Jukjeon campus. You want to practice English and make international friends. Speak mostly in the language the user writes in; if they write Korean, answer in easy Korean. You know campus life well (course registration, the cafeteria, the shuttle bus, the student dorm) and like to help.`;
  const system = `${persona}
You are chatting 1:1 on a buddy-matching app. Keep replies short like real chat messages (1-3 sentences), friendly and curious, and ask a question back. Never claim to be human if sincerely asked; you are an AI practice buddy.
The person you are talking to:
${describeProfile(me)}`;
  const videoNote =
    event === "video-on"
      ? `\nThe user just turned on their camera for a video call, and you turned yours on too. Reply with one short, warm line reacting to seeing them (for example waving hello), in the language you have been using.`
      : event === "friend"
        ? `\nThe user just added you as a friend on the app. Reply with one short, happy line about becoming friends, in the language you have been using.`
        : "";
  const turns = (history ?? []).slice(-20);
  if (event === "video-on") turns.push({ role: "user", content: "(I just turned on my camera.)" });
  if (event === "friend") turns.push({ role: "user", content: "(I added you as a friend.)" });
  if (!turns.length || turns[0].role !== "user") turns.unshift({ role: "user", content: "(The chat just started. Greet me.)" });
  const reply = await askAI(system + videoNote, turns, 1500);
  if (reply) return NextResponse.json({ text: reply, ai: true });
  // No AI key, quota exceeded or an error: answer from the prepared topic set instead.
  const bot = me.role === "korean" ? "emma" : "minjun";
  const lastUser = [...(history ?? [])].reverse().find((t) => t.role === "user")?.content ?? "";
  const userText = event === "video-on" ? "camera" : event === "friend" ? "(added you as a friend)" : history?.length ? lastUser : "hello";
  return NextResponse.json({ text: fallbackReply(bot, userText, history?.length ?? 0), ai: false });
}
