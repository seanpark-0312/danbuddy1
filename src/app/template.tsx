"use client";
import { usePathname } from "next/navigation";

/**
 * A template is mounted again on every navigation, so each page plays the same rise-in as the home page.
 * The home page has its own staged animation, so it is left alone.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const home = usePathname() === "/";
  return <div className={home ? undefined : "page-enter"}>{children}</div>;
}
