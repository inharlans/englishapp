import Link from "next/link";

export default function HomePage() {
  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/85 p-7 shadow-[0_24px_55px_-30px_rgba(15,23,42,0.7)] backdrop-blur">
        <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-teal-300/35 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 left-12 h-40 w-40 rounded-full bg-sky-300/30 blur-2xl" />

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            English Training Suite
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            English 1500
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Start from weekly memorize cards, then jump into quizzes. Every wrong answer comes
            back later so review cycles stay active.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/memorize"
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Start Memorize
            </Link>
            <Link
              href="/quiz-meaning"
              className="rounded-xl border border-teal-300 bg-teal-50 px-5 py-2.5 text-sm font-semibold text-teal-900 transition hover:-translate-y-0.5 hover:bg-teal-100"
            >
              Meaning Quiz
            </Link>
            <Link
              href="/quiz-word"
              className="rounded-xl border border-sky-300 bg-sky-50 px-5 py-2.5 text-sm font-semibold text-sky-900 transition hover:-translate-y-0.5 hover:bg-sky-100"
            >
              Word Quiz
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/memorize"
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-1 hover:border-teal-300"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
            Memorize
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">Weekly Deck</h2>
          <p className="mt-2 text-sm text-slate-600">Study 50 words by week and lock core meanings.</p>
          <p className="mt-4 text-xs font-semibold text-slate-500 group-hover:text-teal-700">
            Open memorize page
          </p>
        </Link>

        <Link
          href="/list-half"
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-1 hover:border-amber-300"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            Recovered
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">Recovery List</h2>
          <p className="mt-2 text-sm text-slate-600">
            Revisit words that were once right and once wrong.
          </p>
          <p className="mt-4 text-xs font-semibold text-slate-500 group-hover:text-amber-700">
            Open recovered list
          </p>
        </Link>

        <Link
          href="/list-wrong"
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-1 hover:border-rose-300"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">
            Weak Zone
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">Wrong Answers</h2>
          <p className="mt-2 text-sm text-slate-600">
            Target mistakes fast and repair uncertain meanings.
          </p>
          <p className="mt-4 text-xs font-semibold text-slate-500 group-hover:text-rose-700">
            Open wrong list
          </p>
        </Link>
      </div>

      <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-[0_18px_44px_-30px_rgba(15,23,42,0.7)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Data Source</p>
        <p className="mt-2 text-sm text-slate-700">
          Words are loaded from <code className="rounded bg-slate-100 px-1.5 py-0.5">words.tsv</code>.
          Each week includes 50 words.
        </p>
      </div>
    </section>
  );
}
