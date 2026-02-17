"use client";

import Link from "next/link";

export default function WordbookDetailError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-black tracking-tight text-slate-900">단어장 페이지를 불러오지 못했습니다</h1>
      <p className="text-sm text-slate-600">
        잠시 후 다시 시도해 주세요.
        {error.digest ? ` (digest: ${error.digest})` : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => reset()} className="ui-btn-primary px-4 py-2 text-sm">
          다시 시도
        </button>
        <Link href="/wordbooks" className="ui-btn-secondary px-4 py-2 text-sm">
          내 단어장으로 이동
        </Link>
      </div>
    </section>
  );
}
