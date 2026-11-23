import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "DanBuddy 단버디 | 유학생·한국 학생 버디 매칭",
  description: "단국대 유학생과 한국 학생을 AI로 이어 주는 1:1 버디 채팅·화상 대화 플랫폼",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#00489b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-dvh antialiased">
        <LangProvider>
          <a
            href="#content"
            className="sr-only z-50 rounded-lg bg-brand-600 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
          >
            Skip to content
          </a>
          <Header />
          <div id="content">{children}</div>
        </LangProvider>
      </body>
    </html>
  );
}
