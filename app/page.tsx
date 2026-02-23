import Link from "next/link";
import { cookies } from "next/headers";

import { LoginPanel } from "@/components/auth/LoginPanel";
import { getUserFromRequestCookies } from "@/lib/authServer";

export default async function HomePage() {
  const user = await getUserFromRequestCookies(await cookies());

  return (
    <section className="relative grid gap-6 lg:grid-cols-[1.22fr_0.78fr] lg:items-stretch">
      <div className="home-bg-mesh pointer-events-none absolute inset-0 -z-10 rounded-[2rem]" />

      <div className="home-editorial-shell relative overflow-hidden rounded-3xl border border-white/70 p-7 sm:p-8">
        <div className="home-accent-line pointer-events-none absolute -left-16 top-12 h-16 w-64 -rotate-12" />
        <div className="home-accent-dot pointer-events-none absolute right-10 top-10 h-24 w-24 rounded-full" />

        <div className="relative space-y-7">
          <header className="home-reveal-up [animation-delay:60ms]">
            <p className="inline-flex rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-blue-700">
              영영사 학습 보드
            </p>
            <h1 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight text-slate-950 sm:text-5xl">
              오늘의 학습 루틴을
              <br />
              하나의 화면으로 정리하세요
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700 sm:text-base">
              단어 마켓 탐색부터 암기, 퀴즈, 오프라인 복습까지 한 흐름으로 연결됩니다.
              매일 같은 리듬으로 학습을 이어가 보세요.
            </p>
          </header>

          <section className="home-reveal-up grid gap-3 sm:grid-cols-3 [animation-delay:120ms]" aria-label="핵심 학습 흐름">
            <article className="home-rail-card rounded-2xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">탐색</p>
              <h2 className="mt-1 text-base font-extrabold text-slate-900">마켓 큐레이션</h2>
              <p className="mt-1 text-sm text-slate-600">리뷰와 평점을 보고 오늘 학습할 단어를 빠르게 고릅니다.</p>
            </article>
            <article className="home-rail-card rounded-2xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">암기</p>
              <h2 className="mt-1 text-base font-extrabold text-slate-900">카드 반복 학습</h2>
              <p className="mt-1 text-sm text-slate-600">짧은 세션을 반복해 핵심 단어를 장기 기억으로 고정합니다.</p>
            </article>
            <article className="home-rail-card rounded-2xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">점검</p>
              <h2 className="mt-1 text-base font-extrabold text-slate-900">퀴즈 피드백 루프</h2>
              <p className="mt-1 text-sm text-slate-600">취약 단어를 즉시 확인하고 다음 복습 루틴에 자동 반영합니다.</p>
            </article>
          </section>

          <section className="home-reveal-up grid gap-3 lg:grid-cols-[1.15fr_0.85fr] [animation-delay:180ms]" aria-label="오늘의 루틴과 지표">
            <article className="home-rail-card rounded-2xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">오늘의 루틴</p>
              <ol className="mt-2 grid gap-2 text-sm text-slate-700">
                <li className="home-flow-item flex items-center justify-between rounded-lg px-3 py-2">
                  <span>1. 주제 선택</span>
                  <span className="font-bold text-blue-700">3분</span>
                </li>
                <li className="home-flow-item flex items-center justify-between rounded-lg px-3 py-2">
                  <span>2. 암기 세션</span>
                  <span className="font-bold text-blue-700">12분</span>
                </li>
                <li className="home-flow-item flex items-center justify-between rounded-lg px-3 py-2">
                  <span>3. 퀴즈 점검</span>
                  <span className="font-bold text-blue-700">8분</span>
                </li>
              </ol>
            </article>

            <article className="home-rail-card rounded-2xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">학습 지표</p>
              <dl className="mt-2 grid grid-cols-2 gap-2">
                <div className="home-pulse rounded-lg px-3 py-2">
                  <dt className="text-[11px] text-slate-500">오늘 목표</dt>
                  <dd className="text-lg font-black text-slate-900">25 단어</dd>
                </div>
                <div className="home-pulse rounded-lg px-3 py-2">
                  <dt className="text-[11px] text-slate-500">예상 완료</dt>
                  <dd className="text-lg font-black text-slate-900">23분</dd>
                </div>
                <div className="home-pulse rounded-lg px-3 py-2">
                  <dt className="text-[11px] text-slate-500">복습 주기</dt>
                  <dd className="text-lg font-black text-slate-900">D+1</dd>
                </div>
                <div className="home-pulse rounded-lg px-3 py-2">
                  <dt className="text-[11px] text-slate-500">진행 모드</dt>
                  <dd className="text-lg font-black text-slate-900">집중</dd>
                </div>
              </dl>
            </article>
          </section>

          <div className="home-reveal-up flex flex-wrap gap-3 [animation-delay:260ms]" role="group" aria-label={user ? "사용자 동작" : "게스트 동작"}>
            {!user ? (
              <>
                <Link href="/wordbooks/market" className="ui-btn-primary px-5 py-2.5 text-sm">
                  마켓 먼저 보기
                </Link>
                <Link href="/login?next=/wordbooks" className="ui-btn-secondary px-5 py-2.5 text-sm">
                  로그인하고 이어가기
                </Link>
              </>
            ) : (
              <>
                <Link href="/wordbooks" className="ui-btn-primary px-5 py-2.5 text-sm">
                  내 단어장 열기
                </Link>
                <Link href="/wordbooks/market" className="ui-btn-secondary px-5 py-2.5 text-sm">
                  마켓 탐색
                </Link>
                <Link href="/offline" className="ui-btn-secondary px-5 py-2.5 text-sm">
                  오프라인 복습
                </Link>
              </>
            )}
          </div>

          <nav aria-label="정책 링크" className="home-reveal-up flex flex-wrap gap-4 text-xs text-slate-500 [animation-delay:320ms]">
            <Link href="/privacy" className="underline underline-offset-4 hover:text-slate-700">
              개인정보처리방침
            </Link>
            <Link href="/terms" className="underline underline-offset-4 hover:text-slate-700">
              서비스 이용약관
            </Link>
          </nav>
        </div>
      </div>

      <div className="lg:pt-2 home-reveal-up [animation-delay:220ms]">
        {!user ? (
          <LoginPanel nextPath="/wordbooks" title="학습 시작" subtitle="로그인하고 바로 내 단어장 학습으로 이동하세요." />
        ) : (
          <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_24px_55px_-30px_rgba(15,23,42,0.75)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">다시 오신 것을 환영합니다</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">오늘 학습을 다시 시작하세요</h2>
            <p className="mt-2 text-sm text-slate-600">
              아래 바로가기로 학습 재개, 마켓 탐색, 오프라인 복습까지 한 번에 이동할 수 있습니다.
            </p>
            <nav aria-label="로그인 사용자 빠른 이동" className="mt-4 grid gap-2 sm:grid-cols-3">
              <Link href="/wordbooks" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-800 hover:bg-slate-50">
                학습 재개
              </Link>
              <Link href="/wordbooks/market" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-800 hover:bg-slate-50">
                마켓 탐색
              </Link>
              <Link href="/offline" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-800 hover:bg-slate-50">
                오프라인 복습
              </Link>
            </nav>
          </section>
        )}
      </div>
    </section>
  );
}
