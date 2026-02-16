"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";

type Pending = { wordbookId: number; title?: string; at: number };

const PENDING_KEY = "download_onboarding_pending";

export function PostDownloadOnboardingBanner({
  availableWordbookIds
}: {
  availableWordbookIds: number[];
}) {
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(PENDING_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Pending;
      if (!parsed || typeof parsed.wordbookId !== "number") return;

      const dismissUntilKey = `download_onboarding_dismiss_until_${parsed.wordbookId}`;
      const dismissedUntil = Number(window.localStorage.getItem(dismissUntilKey) ?? "0");
      if (Date.now() < dismissedUntil) return;
      if (!availableWordbookIds.includes(parsed.wordbookId)) return;

      setPending(parsed);
    } catch {
      // ignore parse errors
    }
  }, [availableWordbookIds]);

  if (!pending) return null;

  const dismiss = () => {
    if (typeof window !== "undefined") {
      const key = `download_onboarding_dismiss_until_${pending.wordbookId}`;
      window.localStorage.setItem(key, String(Date.now() + 24 * 60 * 60 * 1000));
      window.localStorage.removeItem(PENDING_KEY);
    }
    setPending(null);
  };

  return (
    <aside className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Download Complete</p>
      <h2 className="mt-1 text-lg font-black text-slate-900">
        {pending.title ? `"${pending.title}"` : "다운로드 단어장"} 학습을 시작할까요?
      </h2>
      <p className="mt-1 text-sm text-slate-700">지금 바로 암기/퀴즈로 진입해 첫 세션을 시작할 수 있습니다.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={`/wordbooks/${pending.wordbookId}/memorize` as Route} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">Memorize 시작</Link>
        <Link href={`/wordbooks/${pending.wordbookId}/quiz-meaning` as Route} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Quiz Meaning</Link>
        <Link href={`/wordbooks/${pending.wordbookId}/quiz-word` as Route} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Quiz Word</Link>
        <button type="button" onClick={dismiss} className="rounded-lg border border-transparent px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700">나중에</button>
      </div>
    </aside>
  );
}
