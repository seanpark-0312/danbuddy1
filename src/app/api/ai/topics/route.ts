import { NextResponse } from "next/server";
import { LANG_NAMES, askClaude, describeProfile, parseJson } from "@/lib/ai";
import type { Profile } from "@/lib/types";

const FALLBACK = {
  ko: [
    { topic: "단국대에서 가장 좋아하는 장소", line: "캠퍼스에서 제일 좋아하는 곳이 어디예요?", en: "What's your favorite spot on campus?" },
    { topic: "고향 음식", line: "고향에서 제일 그리운 음식이 뭐예요?", en: "What food from home do you miss the most?" },
    { topic: "주말 계획", line: "이번 주말에 뭐 할 거예요?", en: "What are you doing this weekend?" },
  ],
  en: [
    { topic: "Favorite place on campus", line: "What's your favorite spot on campus?", en: "캠퍼스에서 제일 좋아하는 곳이 어디예요?" },
    { topic: "Food from home", line: "What food from home do you miss the most?", en: "고향에서 제일 그리운 음식이 뭐예요?" },
    { topic: "Weekend plans", line: "What are you doing this weekend?", en: "이번 주말에 뭐 할 거예요?" },
  ],
  ja: [
    { topic: "キャンパスで好きな場所", line: "캠퍼스에서 제일 좋아하는 곳이 어디예요?", en: "キャンパスで一番好きな場所はどこですか？" },
    { topic: "地元の料理", line: "고향에서 제일 그리운 음식이 뭐예요?", en: "地元で一番恋しい料理は何ですか？" },
    { topic: "週末の予定", line: "이번 주말에 뭐 할 거예요?", en: "今週末は何をしますか？" },
  ],
  zh: [
    { topic: "校园里最喜欢的地方", line: "캠퍼스에서 제일 좋아하는 곳이 어디예요?", en: "你在校园里最喜欢哪里？" },
    { topic: "家乡美食", line: "고향에서 제일 그리운 음식이 뭐예요?", en: "你最想念家乡的什么美食？" },
    { topic: "周末计划", line: "이번 주말에 뭐 할 거예요?", en: "这个周末打算做什么？" },
  ],
};

export async function POST(req: Request) {
  const { me, partner, recent, lang } = (await req.json()) as {
    me: Profile;
    partner: Profile | null;
    recent: { who: "me" | "partner"; text: string }[];
    lang: string;
  };
  const system = `You help two university students (a Korean student and an international student at Dankook University) keep a friendly conversation going.
Suggest 3 next conversation topics that fit both profiles and the recent chat. Prefer topics that build friendship, cultural exchange, or help the international student with campus and daily life in Korea. Avoid sensitive topics (politics, religion, money, appearance).
For each give: "topic" (short label in ${LANG_NAMES[lang] ?? "English"}), "line" (a natural sentence the user can send, in the language the user should practice or that the partner understands best), and "en" (the same sentence translated into ${LANG_NAMES[lang] ?? "English"}, or into English if "line" is already in that language).
Reply with JSON only: {"topics":[{"topic":"...","line":"...","en":"..."}]}`;
  const user = `USER (me)\n${describeProfile(me)}\n\nPARTNER\n${partner ? describeProfile(partner) : "unknown"}\n\nRECENT CHAT\n${
    recent.slice(-12).map((m) => `${m.who}: ${m.text}`).join("\n") || "(not started yet)"
  }`;
  const parsed = parseJson<{ topics: { topic: string; line: string; en: string }[] }>(
    await askClaude(system, [{ role: "user", content: user }]),
  );
  if (!parsed) return NextResponse.json({ topics: FALLBACK[lang as keyof typeof FALLBACK] ?? FALLBACK.en, ai: false });
  return NextResponse.json({ topics: parsed.topics.slice(0, 3), ai: true });
}
