"use client";
import Link from "next/link";
import { LangToggle, useT } from "@/lib/i18n";

export default function Header() {
  const tr = useT();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-brand-900">
          <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-black text-white">D</span>
          <span translate="no">DanBuddy</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/lobby" className="hidden rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 sm:block">
            {tr("버디 찾기", "Find a buddy")}
          </Link>
          <Link href="/onboard" className="hidden rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 sm:block">
            {tr("내 프로필", "My profile")}
          </Link>
          <LangToggle />
        </nav>
      </div>
    </header>
  );
}
