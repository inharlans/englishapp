import Link from "next/link";

export default function HomePage() {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h1 className="mb-2 text-2xl font-semibold">English 1500</h1>
      <p className="mb-4 text-sm text-slate-600">
        Words are loaded automatically from <code>words.tsv</code>. Study by week (50 words each).
      </p>
      <Link
        href="/memorize"
        className="inline-block rounded-lg bg-slate-900 px-4 py-2 text-white"
      >
        Go to Memorize
      </Link>
    </section>
  );
}
