import { NextResponse } from "next/server";
import { AI_MODEL, callAI } from "@/lib/ai";

export const dynamic = "force-dynamic";

/** Health check for the AI features: is a key set, and does one tiny call work? Never shows the key. */
export async function GET() {
  const t0 = Date.now();
  const r = await callAI("Reply with the single word: ok", [{ role: "user", content: "ping" }], 50, 15000);
  return NextResponse.json({
    model: AI_MODEL,
    configured: r.error !== "no-key",
    ok: !!r.text,
    error: r.error ?? null,
    status: r.status ?? null,
    detail: r.detail ?? null,
    ms: Date.now() - t0,
  });
}
