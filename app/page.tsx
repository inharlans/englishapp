import Link from "next/link";

export default function HomePage() {
  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-7 shadow-[0_24px_55px_-30px_rgba(15,23,42,0.7)] backdrop-blur">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-teal-300/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-10 h-52 w-52 rounded-full bg-cyan-300/30 blur-3xl" />

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Englishapp</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            단어장 선택 후 학습하는 구조
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            이제 학습은 단어장 내부에서만 진행됩니다.
            <br />
            `/wordbooks/[id]/memorize`, `/quiz-meaning`, `/quiz-word`, `/list-*` 경로로 바로 이동해 같은 단어장 기준으로 학습 상태를 관리합니다.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/wordbooks" className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800">
              내 단어장 열기
            </Link>
            <Link href="/wordbooks/market" className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-slate-50">
              마켓 둘러보기
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/wordbooks"
          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-1 hover:border-teal-300"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-teal-500/20 to-cyan-400/15 opacity-70" />
          <div className="relative">
            <h2 className="text-xl font-bold text-slate-900">내 단어장</h2>
            <p className="mt-2 text-sm text-slate-700">다운로드한 단어장을 선택해 암기/퀴즈/리스트로 이동합니다.</p>
          </div>
        </Link>

        <Link
          href="/wordbooks/market"
          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-1 hover:border-teal-300"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-400/15 opacity-70" />
          <div className="relative">
            <h2 className="text-xl font-bold text-slate-900">Wordbook Market</h2>
            <p className="mt-2 text-sm text-slate-700">공개 단어장을 다운로드한 뒤 바로 단어장 내부 학습으로 이어집니다.</p>
          </div>
        </Link>
      </div>

      <div className="rounded-2xl border border-white/70 bg-white/85 p-5 shadow-[0_18px_44px_-30px_rgba(15,23,42,0.7)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Policy</p>
        <p className="mt-2 text-sm text-slate-700">
          다운로드 단어장은 원본 변경이 금지됩니다. 정답/오답/회복 같은 학습 상태만 사용자별로 저장됩니다.
        </p>
      </div>
    </section>
  );
}
