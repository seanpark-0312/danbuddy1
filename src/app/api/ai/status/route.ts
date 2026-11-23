import { NextResponse } from "next/server";
import { callModel, modelChain } from "@/lib/ai";

export const dynamic = "force-dynamic";

/** Health check for the AI features: is a key set, and which models answer right now? Never shows the key. */
export async function GET() {
  const results = [];
  for (const model of modelChain()) {
    const t0 = Date.now();
    const r = await callModel(model, "Reply with the single word: ok", [{ role: "user", content: "ping" }], 50, 12000);
    results.push({ model, ok: !!r.text, error: r.error ?? null, status: r.status ?? null, detail: r.detail ?? null, ms: Date.now() - t0 });
    if (r.error === "no-key") break;
  }
  return NextResponse.json({ configured: results[0]?.error !== "no-key", ok: results.some((r) => r.ok), results });
}
