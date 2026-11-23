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
    <main className="mx-auto max-w-6xl px-4 pb-20">
      <section className="grid items-center gap-10 py-12 md:grid-cols-2 md:py-20">
        <div className="enter">
          <p className="mb-4 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
            {tr("단국대 유학생 × 한국 학생 버디 매칭", "Dankook international × Korean student buddies")}
          </p>
          <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-brand-900 md:text-5xl">
            {tr("말 걸기 어려웠던 그 친구,", "The friend you never")}
            <br />
            <span className="text-brand-600">{tr("단버디가 이어 줄게요.", "got to talk to. DanBuddy connects you.")}</span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-600">
            {tr(
              "외국인 친구와 영어 회화를 원하는 한국 학생, 한국 생활과 학교 적응이 필요한 유학생. 서로에게 꼭 필요한 버디를 만나 채팅으로 시작하고, 마음이 맞으면 화상으로 이야기해 보세요.",
              "Korean students who want international friends and English practice. International students who need help settling into Korea and campus life. Meet the buddy you need, start with chat, and switch to video when you're both ready.",
            )}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/onboard" className="btn-primary px-6 py-3 text-base">
              {tr("버디 만나러 가기", "Find my buddy")} →
            </Link>
          </div>
        </div>
        <div className="enter-2 relative">
          <div className="card space-y-3 p-5 shadow-[0_20px_50px_-20px_rgba(0,72,155,0.25)]">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-600 font-semibold text-white">E</span>
              <div>
                <p className="font-semibold">Emma · France</p>
                <p className="text-xs text-brand-600">✦ {tr("둘 다 카페 탐방과 K-드라마를 좋아해요", "You both love cafes and K-dramas")}</p>
              </div>
              <span className="ml-auto text-lg font-bold text-brand-600">92</span>
            </div>
            <Bubble side="left">Hi! Do you know a good place to eat near Jukjeon campus? 😊</Bubble>
            <Bubble side="right">{tr("물론이죠! 정문 앞 칼국수 집 추천해요. Have you tried kalguksu?", "Sure! Try the kalguksu place by the main gate.")}</Bubble>
            <Bubble side="left">Not yet! Can we go together this Friday?</Bubble>
            <div className="flex items-center gap-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-900">
              <span className="flex-1">{tr("Emma 님이 화상 대화를 요청했어요", "Emma asked to switch to video")}</span>
              <span className="rounded-lg bg-brand-600 px-2 py-1 text-xs font-semibold text-white">{tr("수락", "Accept")}</span>
            </div>
          </div>
        </div>
      </section>

      <Crew className="enter-3 mx-auto -mt-4 mb-10 max-w-3xl md:-mt-8" />

      <section className="enter-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="card card-hover p-5">
            <div className="text-xs font-bold tracking-widest text-brand-600">{f.icon}</div>
            <h3 className="mt-3 font-bold text-brand-900">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-12 card p-6 md:p-8">
        <h2 className="text-xl font-bold text-brand-900">{tr("이렇게 사용해요", "How to use")}</h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-4">
          {[
            tr("프로필 작성: 한국 학생/유학생, 관심사, 원하는 도움", "Profile: Korean or international, interests, what you need"),
            tr("로비에서 AI 추천 버디 확인 또는 랜덤 매칭", "See AI-recommended buddies or random match in the lobby"),
            tr("채팅 중 AI 번역·주제 추천으로 대화 이어가기", "Keep chatting with AI translation and topic ideas"),
            tr("원하면 화상채팅으로도 이야기 나누기", "Video chat too, whenever you like"),
          ].map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
              <span className="text-sm text-slate-700">{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-6 rounded-lg border-l-4 border-brand-600 bg-brand-50 p-3 text-sm text-brand-900">
          {tr(
            "혼자 체험해 보신다면: 브라우저 창 두 개로 각각 한국 학생·유학생 프로필을 만들어 서로 매칭하거나, 로비의 'AI 연습 버디'와 대화해 보세요.",
            "Trying it alone? Open two browser windows with a Korean and an international profile and match them, or chat with the 'AI practice buddy' in the lobby.",
          )}
        </p>
      </section>
    </main>
  );
}

function Bubble({ side, children }: { side: "left" | "right"; children: React.ReactNode }) {
  return (
    <div className={`flex ${side === "right" ? "justify-end" : ""}`}>
      <p
        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
          side === "right" ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md bg-slate-100 text-slate-800"
        }`}
      >
        {children}
      </p>
    </div>
  );
}
