import Link from "next/link";
import type { Route } from "next";

const cards = [
  {
    href: "/memorize" as Route,
    title: "통합 Memorize",
    desc: "기본 1500 + 다운로드 단어장을 같은 화면에서 선택해 학습합니다.",
    tone: "from-teal-500/20 to-cyan-400/15"
  },
  {
    href: "/quiz-meaning" as Route,
    title: "통합 Quiz",
    desc: "의미/단어 퀴즈에서 단어장을 바로 전환하고 개인 학습 상태를 유지합니다.",
    tone: "from-sky-500/20 to-indigo-400/15"
  },
  {
    href: "/wordbooks/market" as Route,
    title: "Wordbook Market",
    desc: "공개 단어장을 다운로드해서 읽기 전용 학습 흐름으로 바로 이어집니다.",
    tone: "from-amber-500/20 to-orange-400/15"
  }
];

export default function HomePage() {
  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-7 shadow-[0_24px_55px_-30px_rgba(15,23,42,0.7)] backdrop-blur">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-teal-300/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-10 h-52 w-52 rounded-full bg-cyan-300/30 blur-3xl" />

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Englishapp</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            기본 1500 + 단어장 통합 학습
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            /memorize, /quiz-meaning, /quiz-word, 리스트 페이지에서 학습 소스를 즉시 바꿔가며
            같은 흐름으로 공부할 수 있습니다. 다운로드 단어장은 읽기 전용으로 보호됩니다.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/memorize" className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800">
              시작하기
            </Link>
            <Link href="/wordbooks" className="rounded-xl border border-teal-300 bg-teal-50 px-5 py-2.5 text-sm font-semibold text-teal-900 transition hover:-translate-y-0.5 hover:bg-teal-100">
              내 단어장
            </Link>
            <Link href="/wordbooks/market" className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-slate-50">
              마켓 둘러보기
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-1 hover:border-teal-300"
          >
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.tone} opacity-70`} />
            <div className="relative">
              <h2 className="text-xl font-bold text-slate-900">{card.title}</h2>
              <p className="mt-2 text-sm text-slate-700">{card.desc}</p>
              <p className="mt-4 text-xs font-semibold text-slate-500 group-hover:text-teal-700">열기</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-white/70 bg-white/85 p-5 shadow-[0_18px_44px_-30px_rgba(15,23,42,0.7)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Policy</p>
        <p className="mt-2 text-sm text-slate-700">
          다운로드 단어장은 콘텐츠 수정이 금지됩니다. 학습 상태(정답/오답/진도)만 사용자별로 저장됩니다.
        </p>
      </div>
    </section>
  );
}
