"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LangToggle, useT } from "@/lib/i18n";
import { hasSessionProfile } from "@/lib/profile";

export default function Header() {
  const tr = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [needProfile, setNeedProfile] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  // the profile is in sessionStorage, so read it after mount and again on every page change
  useEffect(() => {
    setHasProfile(hasSessionProfile());
  }, [pathname]);

  useEffect(() => {
    if (!needProfile) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setNeedProfile(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [needProfile]);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-brand-900">
          <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-black text-white">D</span>
          <span translate="no">DanBuddy</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {/* text link on a computer; no search icon on a phone */}
          <NavLink href="/lobby" label={tr("버디 찾기", "Find a buddy")} desktopOnly />
          <NavLink
            href="/friends"
            label={tr("친구", "Friends")}
            icon={<path d="M16 21v-1a5 5 0 0 0-5-5H7a5 5 0 0 0-5 5v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />}
            onClick={(e) => {
              if (hasSessionProfile()) return;
              e.preventDefault();
              setNeedProfile(true);
            }}
          />
          <NavLink
            href={hasProfile ? "/profile" : "/onboard"}
            activeOn="/profile"
            label={tr("내 프로필", "My profile")}
            icon={<path d="M20 21v-1a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v1M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />}
          />
          <LangToggle />
        </nav>
      </div>

      {needProfile && (
        <div className="fixed inset-0 z-50 grid h-dvh place-items-center overscroll-contain bg-slate-900/40 p-4" onClick={() => setNeedProfile(false)}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="need-profile-title"
            aria-describedby="need-profile-body"
            className="card enter w-full max-w-sm p-6 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <span aria-hidden="true" className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-1a5 5 0 0 0-5-5H7a5 5 0 0 0-5 5v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
              </svg>
            </span>
            <p id="need-profile-title" className="mt-3 text-lg font-semibold text-brand-900">
              {tr("프로필을 먼저 만들어 주세요", "Create your profile first")}
            </p>
            <p id="need-profile-body" className="mt-1 text-sm text-slate-600">
              {tr("친구 목록은 프로필을 만든 뒤에 볼 수 있어요.", "You can see your friends after you set up a profile.")}
            </p>
            <div className="mt-5 grid gap-2">
              <button
                className="btn-primary"
                autoFocus
                onClick={() => {
                  setNeedProfile(false);
                  router.push("/onboard");
                }}
              >
                {tr("프로필 만들러 가기", "Create my profile")}
              </button>
              <button className="btn-ghost" onClick={() => setNeedProfile(false)}>
                {tr("취소", "Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/** Text link on a computer, icon button on a phone. */
function NavLink({
  href,
  label,
  icon,
  activeOn,
  desktopOnly,
  onClick,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
  activeOn?: string;
  desktopOnly?: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const active = usePathname() === (activeOn ?? href);
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={`${desktopOnly ? "hidden" : "grid"} h-9 w-9 place-items-center rounded-lg text-sm sm:flex sm:h-auto sm:w-auto sm:px-3 sm:py-1.5 ${
        active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {icon && (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="sm:hidden">
          {icon}
        </svg>
      )}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
