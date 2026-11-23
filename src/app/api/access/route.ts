import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { code } = (await req.json()) as { code: string };
  const expected = process.env.ACCESS_CODE;
  if (expected && code?.trim() !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("danbuddy_access", expected ?? "open", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 60,
    path: "/",
  });
  return res;
}
