"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";

type Suggestion = {
  href: Route;
  label: string;
  eta: string;
  reason: string;
};

export function SessionRecapPanel({
  title,
  summary,
  suggestion,
  secondaryHref,
  secondaryLabel
}: {
  title: string;
  summary: string;
  suggestion: Suggestion;
  secondaryHref?: Route;
  secondaryLabel?: string;
}) {
  const [reminderEnabled, setReminderEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setReminderEnabled(window.localStorage.getItem("daily_study_reminder") === "1");
  }, []);

  const reminderText = useMemo(
    () =>
      reminderEnabled
        ? "내일 같은 시간에 공부 시작 알림이 켜져 있습니다."
        : "내일 같은 시간 알림을 켜서 학습 루틴을 유지할 수 있습니다.",
    [reminderEnabled]
  );

  return (
    <aside className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Session Recap</p>
      <h3 className="mt-1 text-lg font-black text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-700">{summary}</p>

      <div className="mt-3 rounded-xl border border-white/80 bg-white/80 p-3">
        <p className="text-sm font-semibold text-slate-900">다음 추천: {suggestion.label}</p>
        <p className="mt-1 text-xs text-slate-600">예상 소요 {suggestion.eta} · {suggestion.reason}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            href={suggestion.href}
            className="ui-btn-primary px-3 py-1.5 text-xs"
          >
            바로 이동
          </Link>
          {secondaryHref && secondaryLabel ? (
            <Link
              href={secondaryHref}
              className="ui-btn-secondary px-3 py-1.5 text-xs"
            >
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>

      <label className="mt-3 inline-flex items-center gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={reminderEnabled}
          onChange={(e) => {
            const next = e.target.checked;
            setReminderEnabled(next);
            if (typeof window !== "undefined") {
              window.localStorage.setItem("daily_study_reminder", next ? "1" : "0");
            }
          }}
          className="h-4 w-4 accent-blue-600"
        />
        내일 같은 시간 알림
      </label>
      <p className="mt-1 text-[11px] text-slate-600">{reminderText}</p>
    </aside>
  );
}

