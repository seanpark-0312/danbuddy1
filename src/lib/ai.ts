export const LANG_NAMES: Record<string, string> = {
  ko: "Korean",
  en: "English",
  ja: "Japanese",
  zh: "Simplified Chinese",
  es: "Spanish",
  fr: "French",
  de: "German",
  ru: "Russian",
  kk: "Kazakh (Cyrillic)",
  vi: "Vietnamese",
};

// Google Gemini API (free tier from Google AI Studio). "gemini-flash-latest" always points to the current Flash model.
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const API_KEY = process.env.GEMINI_API_KEY;

export function aiEnabled() {
  return !!API_KEY;
}

export interface Turn {
  role: "user" | "assistant";
  content: string;
}

/** One short Gemini call. Returns null when no API key is set or the call fails. */
export async function askAI(system: string, messages: Turn[], maxTokens = 2000): Promise<string | null> {
  if (!API_KEY) return null;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        // Flash models may "think" first, which also uses output tokens, so leave generous room.
        generationConfig: { maxOutputTokens: Math.max(maxTokens, 8192), temperature: 0.8 },
      }),
    });
    if (!res.ok) {
      console.error("AI API error", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const data = await res.json();
    const text: string = (data.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
    return text.trim() || null;
  } catch (err) {
    console.error("AI call failed", err);
    return null;
  }
}

/** Pull the first JSON object/array out of a model reply. */
export function parseJson<T>(text: string | null): T | null {
  if (!text) return null;
  const m = text.match(/[[{][\s\S]*[\]}]/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as T;
  } catch {
    return null;
  }
}

export function describeProfile(p: {
  nickname: string;
  role: string;
  country: string;
  major?: string;
  koreanLevel: string;
  englishLevel: string;
  interests: string[];
  goals: string[];
  intro?: string;
}) {
  return [
    `nickname: ${p.nickname}`,
    `type: ${p.role === "korean" ? "Korean student" : "international student"}`,
    `country: ${p.country}`,
    p.major ? `major: ${p.major}` : "",
    `Korean level: ${p.koreanLevel}, English level: ${p.englishLevel}`,
    `interests: ${p.interests.join(", ") || "-"}`,
    `goals: ${p.goals.join(", ") || "-"}`,
    p.intro ? `intro: ${p.intro.slice(0, 300)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
