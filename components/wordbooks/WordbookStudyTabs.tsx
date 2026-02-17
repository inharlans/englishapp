"use client";

import Link from "next/link";

const tabs = [
  { key: "memorize", label: "암기", href: (id: number) => `/wordbooks/${id}/memorize` },
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
  return (
    <nav aria-label="단어장 학습 탭" className="sticky top-2 z-20 ui-card p-2">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={{ pathname: tab.href(wordbookId) }}
              data-testid={tab.key === "memorize" ? "wordbook-study-link" : tab.key === "quiz-meaning" ? "wordbook-quiz-link" : undefined}
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.localStorage.setItem(`wordbook_last_tab_${wordbookId}`, tab.key);
                }
              }}
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
          <Link href={{ pathname: `/wordbooks/${wordbookId}` }} className="ml-auto ui-btn-secondary px-3 py-2 text-xs font-semibold">
            뒤로
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
