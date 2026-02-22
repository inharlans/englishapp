import Link from "next/link";
import { cookies } from "next/headers";

import { LoginPanel } from "@/components/auth/LoginPanel";
import { getUserFromRequestCookies } from "@/lib/authServer";

export default async function HomePage() {
  const user = await getUserFromRequestCookies(await cookies());

  return (
    <section className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-stretch">
      <div className="home-bg-mesh pointer-events-none absolute inset-0 -z-10 rounded-[2rem]" />

      <div className="home-hero-shell relative overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-7 backdrop-blur">
        <div className="home-float-orb pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full bg-blue-300/35 blur-3xl" />
        <div className="home-float-orb pointer-events-none absolute -bottom-20 left-8 h-56 w-56 rounded-full bg-amber-300/30 blur-3xl [animation-delay:1200ms]" />

        <div className="relative space-y-7">
          <div className="home-reveal-up [animation-delay:60ms]">
            <p className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-blue-700">
              englishapp learning system
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              단어장 하나로
              <br />
              오늘 학습 루틴 완성
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              마켓 탐색부터 암기, 퀴즈, 오프라인 복습까지 단어장 중심 흐름으로 연결합니다. 학습 진행 이력은
              자동으로 누적되어 다음 세션에서도 바로 이어집니다.
            </p>
          </div>

          <div className="home-reveal-up grid gap-3 sm:grid-cols-3 [animation-delay:140ms]" aria-label="핵심 학습 포인트">
            <article className="rounded-2xl border border-slate-200/90 bg-white/90 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">market</p>
              <h2 className="mt-1 text-base font-extrabold text-slate-900">공개 단어장 탐색</h2>
              <p className="mt-1 text-sm text-slate-600">평가와 리뷰를 보고 바로 학습할 단어장을 선택합니다.</p>
            </article>
            <article className="rounded-2xl border border-slate-200/90 bg-white/90 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">memorize</p>
              <h2 className="mt-1 text-base font-extrabold text-slate-900">암기 + 퀴즈 전환</h2>
              <p className="mt-1 text-sm text-slate-600">학습 모드를 빠르게 넘기며 집중 루틴을 유지합니다.</p>
            </article>
            <article className="rounded-2xl border border-slate-200/90 bg-white/90 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">offline</p>
              <h2 className="mt-1 text-base font-extrabold text-slate-900">오프라인 복습</h2>
              <p className="mt-1 text-sm text-slate-600">이동 중에도 저장한 단어장을 끊김 없이 복습할 수 있습니다.</p>
            </article>
          </div>

          <ul className="home-reveal-up grid gap-2 rounded-2xl border border-slate-200/90 bg-white/85 p-4 text-sm text-slate-700 [animation-delay:220ms]" aria-label="빠른 시작 체크리스트">
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              단어장 마켓에서 주제별로 찾아보기
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              로그인 후 내 학습 상태로 즉시 이어가기
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              오프라인 라이브러리에 저장해 반복 복습
            </li>
          </ul>

          <div className="home-reveal-up flex flex-wrap gap-3 [animation-delay:280ms]" role="group" aria-label={user ? "학습 바로가기" : "게스트 시작 동작"}>
            {!user ? (
              <>
                <Link href="/wordbooks/market" className="ui-btn-primary px-5 py-2.5 text-sm">
                  마켓 먼저 보기
                </Link>
                <Link href="/login?next=/wordbooks" className="ui-btn-secondary px-5 py-2.5 text-sm">
                  로그인 페이지 열기
                </Link>
              </>
            ) : (
              <>
                <Link href="/wordbooks" className="ui-btn-primary px-5 py-2.5 text-sm">
                  내 단어장 열기
                </Link>
                <Link href="/wordbooks/market" className="ui-btn-secondary px-5 py-2.5 text-sm">
                  마켓 다시 보기
                </Link>
                <Link href="/offline" className="ui-btn-secondary px-5 py-2.5 text-sm">
                  오프라인 라이브러리
                </Link>
              </>
            )}
          </div>

          <nav aria-label="정책 링크" className="home-reveal-up flex flex-wrap gap-4 text-xs text-slate-500 [animation-delay:340ms]">
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
          <LoginPanel
            nextPath="/wordbooks"
            title="학습 시작"
            subtitle="로그인하고 바로 내 단어장 학습으로 이동하세요."
          />
        ) : (
          <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-[0_24px_55px_-30px_rgba(15,23,42,0.75)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">다시 오신 것을 환영합니다</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">학습 계속하기</h2>
            <p className="mt-2 text-sm text-slate-600">오늘은 아래 바로가기로 학습 재개, 마켓 탐색, 오프라인 복습까지 바로 이동할 수 있습니다.</p>
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

