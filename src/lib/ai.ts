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

export interface AIResult {
  text: string | null;
  /** why text is null: no key set, the API answered with an error, or it took too long */
  error?: "no-key" | "api" | "timeout";
  status?: number;
  detail?: string;
}

// When a model is busy (503), rate limited (429) or gone (404), the next one in this list is tried.
const FALLBACK_MODELS = ["gemini-flash-lite-latest", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
const RETRY_STATUS = new Set([404, 429, 500, 502, 503, 504]);

export function modelChain() {
  return [MODEL, ...FALLBACK_MODELS.filter((m) => m !== MODEL)];
}

/** One Gemini call to a specific model. Never throws. */
export async function callModel(model: string, system: string, messages: Turn[], maxTokens: number, timeoutMs: number): Promise<AIResult> {
  if (!API_KEY) return { text: null, error: "no-key" };
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        // Flash models may "think" first, which also uses output tokens, so leave generous room.
        generationConfig: { maxOutputTokens: Math.max(maxTokens, 8192), temperature: 0.8 },
      }),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 400);
      console.error("AI API error", model, res.status, body);
      let detail = body;
      try {
        detail = JSON.parse(body)?.error?.message ?? body;
      } catch {}
      return { text: null, error: "api", status: res.status, detail: String(detail).slice(0, 200) };
    }
    const data = await res.json();
    const text: string = (data.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
    if (!text.trim()) return { text: null, error: "api", status: 200, detail: data.candidates?.[0]?.finishReason ?? "empty reply" };
    return { text: text.trim() };
  } catch (err) {
    const timeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    console.error("AI call failed", model, err);
    return { text: null, error: timeout ? "timeout" : "api", detail: err instanceof Error ? err.message.slice(0, 200) : undefined };
  }
}

/** Gemini call with a total time limit, moving to a backup model when one is busy. Never throws. */
export async function callAI(system: string, messages: Turn[], maxTokens = 2000, timeoutMs = 15000): Promise<AIResult> {
  if (!API_KEY) return { text: null, error: "no-key" };
  const deadline = Date.now() + timeoutMs;
  let last: AIResult = { text: null, error: "timeout" };
  for (const model of modelChain()) {
    const left = deadline - Date.now();
    if (left < 1500) break;
    last = await callModel(model, system, messages, maxTokens, left);
    if (last.text || last.error === "timeout" || !RETRY_STATUS.has(last.status ?? 0)) return last;
  }
  return last;
}

/** Same as callAI, returning only the text (null on any failure). */
export async function askAI(system: string, messages: Turn[], maxTokens = 2000, timeoutMs = 15000): Promise<string | null> {
  return (await callAI(system, messages, maxTokens, timeoutMs)).text;
}

export const AI_MODEL = MODEL;

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
