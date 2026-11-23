import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  console.warn("[report]", JSON.stringify({ ...body, at: new Date().toISOString() }));
  return NextResponse.json({ ok: true });
}
