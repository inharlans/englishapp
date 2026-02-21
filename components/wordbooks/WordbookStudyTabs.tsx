"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Route } from "next";
import { useSearchParams } from "next/navigation";

const cardsEnabled = process.env.NEXT_PUBLIC_ENABLE_WORDBOOK_CARDS !== "0";

const tabs = [
  { key: "memorize", label: "암기", href: (id: number) => `/wordbooks/${id}/memorize` },
  ...(cardsEnabled ? [{ key: "cards", label: "카드", href: (id: number) => `/wordbooks/${id}/cards` }] : []),
  { key: "quiz-meaning", label: "의미 퀴즈", href: (id: number) => `/wordbooks/${id}/quiz-meaning` },
  { key: "quiz-word", label: "단어 퀴즈", href: (id: number) => `/wordbooks/${id}/quiz-word` },
  { key: "list-correct", label: "정답 목록", href: (id: number) => `/wordbooks/${id}/list-correct` },
  { key: "list-wrong", label: "오답 목록", href: (id: number) => `/wordbooks/${id}/list-wrong` },
  { key: "list-half", label: "회복 목록", href: (id: number) => `/wordbooks/${id}/list-half` }
] as const;

export type StudyTabKey = (typeof tabs)[number]["key"];

export function WordbookStudyTabs({
  wordbookId,
  active,
  showBack = true
}: {
  wordbookId: number;
  active: StudyTabKey;
  showBack?: boolean;
}) {
  const searchParams = useSearchParams();
  const queryString = useMemo(() => {
    const next = new URLSearchParams();
    const partSize = searchParams.get("partSize");
    const partIndex = searchParams.get("partIndex");
    if (partSize) next.set("partSize", partSize);
    if (partIndex) next.set("partIndex", partIndex);
    return next.toString();
  }, [searchParams]);
  const partSize = searchParams.get("partSize");
  const partIndex = searchParams.get("partIndex");
  const activeLabel = tabs.find((tab) => tab.key === active)?.label ?? "학습";

  return (
    <nav aria-label="단어장 학습 탭" className="sticky top-2 z-20 ui-card p-2">
      <p className="sr-only" role="status" aria-live="polite">
        현재 탭 {activeLabel}
        {partIndex ? `, ${partIndex}파트` : ""}
        {partSize ? `, 파트 크기 ${partSize}` : ""}
      </p>
      <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={(queryString ? `${tab.href(wordbookId)}?${queryString}` : tab.href(wordbookId)) as Route}
              data-testid={tab.key === "memorize" ? "wordbook-study-link" : tab.key === "quiz-meaning" ? "wordbook-quiz-link" : undefined}
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.localStorage.setItem(`wordbook_last_tab_${wordbookId}`, tab.key);
                  window.localStorage.setItem(
                    `wordbook_last_studied_at_${wordbookId}`,
                    String(Date.now())
                  );
                }
              }}
              aria-current={isActive ? "page" : undefined}
              aria-label={`${tab.label}${isActive ? " (현재 탭)" : ""}`}
              title={`${tab.label}${partIndex ? ` · ${partIndex}파트` : ""}`}
              data-state={isActive ? "active" : "inactive"}
              className={[
                "rounded-lg px-3 py-2 text-xs font-semibold transition",
                isActive ? "ui-tab-active" : "ui-tab-inactive"
              ].join(" ")}
            >
              {tab.label}
            </Link>
          );
        })}
        {showBack ? (
          <Link
            href={(queryString ? `/wordbooks/${wordbookId}?${queryString}` : `/wordbooks/${wordbookId}`) as Route}
            className="ml-auto ui-btn-secondary px-3 py-2 text-xs font-semibold"
          >
            뒤로
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
