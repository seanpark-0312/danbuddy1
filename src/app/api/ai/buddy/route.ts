import { NextResponse } from "next/server";
import { askAI, describeProfile, type Turn } from "@/lib/ai";
import type { Profile } from "@/lib/types";
import { fallbackReply } from "@/lib/buddyFallback";
import { AI_BUDDIES, isBuddyKey } from "@/lib/aiBuddies";

/** AI practice buddy, used when no human buddy is online (e.g. a judge testing alone). */
export async function POST(req: Request) {
  const { me, history, event, bot: botKey } = (await req.json()) as { me: Profile; history: Turn[]; event?: "video-on" | "friend"; bot?: string };
  const bot = AI_BUDDIES[isBuddyKey(botKey) ? botKey : me.role === "korean" ? "emma" : "minjun"];
  const persona = bot.persona;
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
  const lastUser = [...(history ?? [])].reverse().find((t) => t.role === "user")?.content ?? "";
  const userText = event === "video-on" ? "camera" : event === "friend" ? "(added you as a friend)" : history?.length ? lastUser : "hello";
  return NextResponse.json({ text: fallbackReply(bot.key, userText, history?.length ?? 0), ai: false });
}
