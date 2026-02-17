import Link from "next/link";

import { LoginPanel } from "@/components/auth/LoginPanel";

export default function HomePage() {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
      <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-7 shadow-[0_24px_55px_-30px_rgba(15,23,42,0.7)] backdrop-blur">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-300/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-8 h-52 w-52 rounded-full bg-orange-300/30 blur-3xl" />

        <div className="relative space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Englishapp</p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              영어 단어 학습을
              <br />
              단어장 단위로 빠르게
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              마켓에서 단어장을 살펴보고, 로그인 후 바로 암기와 퀴즈를 이어서 진행하세요.
              오늘 학습량과 정오답 이력도 단어장 기준으로 누적됩니다.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white/85 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Step 1</p>
              <h2 className="mt-1 text-base font-bold text-slate-900">Wordbook Market</h2>
              <p className="mt-1 text-sm text-slate-600">공개 단어장을 먼저 둘러보고 품질을 확인합니다.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/85 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Step 2</p>
              <h2 className="mt-1 text-base font-bold text-slate-900">Memorize & Quiz</h2>
              <p className="mt-1 text-sm text-slate-600">로그인 후 내 학습 상태로 암기/퀴즈를 계속 진행합니다.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/wordbooks/market" className="ui-btn-primary px-5 py-2.5 text-sm">
              마켓 먼저 보기
            </Link>
            <Link href="/login?next=/wordbooks" className="ui-btn-secondary px-5 py-2.5 text-sm">
              로그인 페이지 열기
            </Link>
          </div>
        </div>
      </div>

      <div className="lg:pt-2">
        <LoginPanel
          nextPath="/wordbooks"
          title="Start Learning"
          subtitle="로그인하고 바로 내 단어장 학습으로 이동하세요."
        />
      </div>
    </section>
  );
}

