import { NextResponse, type NextRequest } from "next/server";

/** Optional access-code gate so only the judges can open the demo. Off when ACCESS_CODE is unset. */
export function middleware(req: NextRequest) {
  const code = process.env.ACCESS_CODE;
  if (!code) return NextResponse.next();
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/gate") || pathname.startsWith("/api/access")) return NextResponse.next();
  if (req.cookies.get("danbuddy_access")?.value === code) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "locked" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/gate";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
