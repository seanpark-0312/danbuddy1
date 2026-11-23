import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.AI_MODEL || "claude-opus-5-5";

let client: Anthropic | null | undefined;
function getClient() {
  if (client === undefined) client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
  return client;
}

export function aiEnabled() {
  return !!getClient();
}

export interface Turn {
  role: "user" | "assistant";
  content: string;
}

/** One short Claude call. Returns null when no API key is set or the call fails. */
export async function askClaude(system: string, messages: Turn[], maxTokens = 2000): Promise<string | null> {
  const c = getClient();
  if (!c) return null;
  try {
    const res = await c.beta.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system,
      messages,
    });
    if (res.stop_reason === "refusal") return null;
    let text = "";
    for (const block of res.content) if (block.type === "text") text += block.text;
    return text.trim() || null;
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) console.warn("AI rate limited");
    else if (err instanceof Anthropic.APIError) console.error("AI API error", err.status, err.message);
    else console.error("AI call failed", err);
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
