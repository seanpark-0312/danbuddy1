"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n";
import Crew from "@/components/Crew";

export default function Home() {
  const tr = useT();
  const features = [
    {
      icon: "01",
      title: tr("AI 버디 매칭", "AI buddy matching"),
      body: tr(
        "관심사·목적·언어 수준을 읽고, 서로 도움이 되는 상대와 '왜 잘 맞는지'를 설명해 드려요.",
        "AI reads interests, goals and language levels, then explains why a buddy is a good fit.",
      ),
    },
    {
      icon: "02",
      title: tr("가벼운 1:1 채팅", "Light 1:1 chat"),
      body: tr(
        "랜덤 매칭 또는 추천 상대에게 대화 신청. 대화는 서버에 저장되지 않아요.",
        "Random match or request a recommended buddy. Chats are never stored on a server.",
      ),
    },
    {
      icon: "03",
      title: tr("AI 번역", "AI translation"),
      body: tr(
        "말이 막히면 메시지 번역과 표현 팁을 AI가 바로 알려 줘요.",
        "Stuck? Get instant translation and expression tips from AI.",
      ),
    },
    {
      icon: "04",
      title: tr("원하면 화상채팅까지", "Video chat, if you like"),
      body: tr(
        "채팅하다 이야기가 잘 통하면 화상채팅으로 얼굴 보며 대화할 수 있어요. 언제든 다시 텍스트로 돌아올 수 있어요.",
        "Hit it off in chat? Switch to video chat and talk face to face. You can go back to text anytime.",
      ),
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      {/* hero: muted navy + sky gradient, students in front of a soft white glow */}
      <section className="hero-bg enter relative mt-4 overflow-hidden rounded-[28px] text-white md:mt-7 md:h-[530px] md:rounded-[32px]">
        <div className="relative z-[3] px-6 pt-7 md:absolute md:left-14 md:top-20 md:w-[480px] md:p-0">
          <p className="inline-block rounded-full border border-white/30 bg-[rgba(5,30,70,0.32)] px-3 py-1.5 text-[12.5px] font-semibold [text-shadow:0_1px_2px_rgba(0,20,60,0.35)] md:text-[13.5px]">
            {tr("단국대 유학생 × 한국 학생 버디 매칭", "Dankook international × Korean student buddies")}
          </p>
          <h1 className="mt-5 text-[29px] font-bold leading-[1.28] tracking-[-0.03em] [text-shadow:0_2px_18px_rgba(0,30,80,0.25)] md:mt-6 md:text-[46px] md:leading-[1.24]">
            {tr("말 걸기 어려웠던 그 친구,", "The friend you never")}
            <br />
            {tr("단버디가 먼저 이어 줄게요.", "got to talk to. DanBuddy connects you.")}
          </h1>
          <p className="mt-3.5 text-[15.5px] leading-relaxed opacity-95 md:hidden">
            {tr("서로에게 꼭 필요한 버디를 만나 채팅으로 시작하고, 마음이 맞으면 화상으로.", "Meet the buddy you need, start with chat, and switch to video when you click.")}
          </p>
          <p className="mt-4 hidden text-[16.5px] leading-relaxed opacity-95 md:block">
            {tr(
              "외국인 친구와 영어 회화를 원하는 한국 학생, 한국 생활과 학교 적응이 필요한 유학생. 서로에게 꼭 필요한 버디를 만나 채팅으로 시작하고, 마음이 맞으면 화상으로.",
              "Korean students who want international friends and English practice. International students who need help settling into Korea and campus life. Meet the buddy you need, start with chat, and switch to video when you're both ready.",
            )}
          </p>
          <Link
            href="/onboard"
            className="mt-8 hidden h-[54px] items-center rounded-2xl bg-white px-6 text-base font-semibold text-brand-600 shadow-[0_10px_30px_rgba(0,40,100,0.25)] transition hover:-translate-y-0.5 md:inline-flex"
          >
            {tr("버디 만나러 가기", "Find my buddy")} →
          </Link>
        </div>
        <div className="relative mt-6 h-[250px] md:absolute md:bottom-0 md:right-0 md:mt-0 md:h-full md:w-[640px]">
          <div
            aria-hidden
            className="absolute -inset-x-5 -bottom-8 h-[260px] md:-bottom-10 md:-right-2 md:left-auto md:h-[440px] md:w-[720px]"
            style={{ background: "radial-gradient(ellipse 55% 52% at 50% 58%, rgba(255,255,255,.55), rgba(255,255,255,.22) 55%, transparent 78%)" }}
          />
          <Crew className="crew-glow absolute inset-x-2 bottom-12 md:inset-x-auto md:-bottom-1.5 md:right-7 md:w-[590px]" />
        </div>
      </section>

      <Link
        href="/onboard"
        className="enter-2 relative z-[4] mx-1 -mt-8 flex h-[52px] items-center justify-center rounded-2xl bg-white text-base font-semibold text-brand-600 shadow-[0_10px_30px_rgba(0,40,100,0.25)] md:hidden"
      >
        {tr("버디 만나러 가기", "Find my buddy")} →
      </Link>

      <section className="enter-3 mt-4 grid grid-cols-2 gap-3 md:mt-6 md:grid-cols-4 md:gap-4">
        {features.map((f) => (
          <div key={f.title} className="card p-4 md:p-5">
            <div className="text-xs font-bold text-[#7a8db0]">{f.icon}</div>
            <h3 className="mt-1.5 text-[15.5px] font-semibold text-slate-900 md:text-[17px]">{f.title}</h3>
            <p className="mt-1 text-[13px] leading-normal text-slate-500 md:text-sm">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-10 card p-6 md:p-8">
        <h2 className="text-xl font-bold text-brand-900">{tr("이렇게 사용해요", "How to use")}</h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-4">
          {[
            tr("프로필 작성: 한국 학생/유학생, 관심사, 원하는 도움", "Profile: Korean or international, interests, what you need"),
            tr("로비에서 AI 추천 버디 확인 또는 랜덤 매칭", "See AI-recommended buddies or random match in the lobby"),
            tr("채팅 중 막히면 AI 번역으로 대화 이어가기", "Keep chatting with AI translation when you get stuck"),
            tr("원하면 화상채팅으로도 이야기 나누기", "Video chat too, whenever you like"),
          ].map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
              <span className="text-sm text-slate-700">{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-6 rounded-xl bg-brand-50 p-3 text-sm text-brand-900">
          {tr(
            "혼자 체험해 보신다면: 브라우저 창 두 개로 각각 한국 학생·유학생 프로필을 만들어 서로 매칭하거나, 로비의 'AI 연습 버디'와 대화해 보세요.",
            "Trying it alone? Open two browser windows with a Korean and an international profile and match them, or chat with the 'AI practice buddy' in the lobby.",
          )}
        </p>
      </section>
    </main>
  );
}
