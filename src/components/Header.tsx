"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
        <nav className="flex items-center gap-1 sm:gap-2">
          <NavLink href="/lobby" label={tr("버디 찾기", "Find a buddy")} icon={<path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3" />} />
          <NavLink
            href="/friends"
            label={tr("친구", "Friends")}
            icon={<path d="M16 21v-1a5 5 0 0 0-5-5H7a5 5 0 0 0-5 5v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />}
          />
          <NavLink href="/profile" label={tr("내 프로필", "My profile")} icon={<path d="M20 21v-1a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v1M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />} />
          <LangToggle />
        </nav>
      </div>
    </header>
  );
}

/** Text link on a computer, icon button on a phone. */
function NavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const active = usePathname() === href;
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`grid h-9 w-9 place-items-center rounded-lg text-sm sm:flex sm:h-auto sm:w-auto sm:px-3 sm:py-1.5 ${
        active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="sm:hidden">
        {icon}
      </svg>
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
