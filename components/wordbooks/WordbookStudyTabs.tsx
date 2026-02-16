import Link from "next/link";

const tabs = [
  { key: "memorize", label: "Memorize", href: (id: number) => `/wordbooks/${id}/memorize` },
  { key: "quiz-meaning", label: "Quiz Meaning", href: (id: number) => `/wordbooks/${id}/quiz-meaning` },
  { key: "quiz-word", label: "Quiz Word", href: (id: number) => `/wordbooks/${id}/quiz-word` },
  { key: "list-correct", label: "List Correct", href: (id: number) => `/wordbooks/${id}/list-correct` },
  { key: "list-wrong", label: "List Wrong", href: (id: number) => `/wordbooks/${id}/list-wrong` },
  { key: "list-half", label: "List Half", href: (id: number) => `/wordbooks/${id}/list-half` }
] as const;

export type StudyTabKey = (typeof tabs)[number]["key"];

export function WordbookStudyTabs({ wordbookId, active }: { wordbookId: number; active: StudyTabKey }) {
  return (
    <nav
      aria-label="Wordbook study tabs"
      className="sticky top-2 z-20 rounded-2xl border border-slate-200/80 bg-white/90 p-2 shadow-sm backdrop-blur"
    >
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
                isActive
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              ].join(" ")}
            >
              {tab.label}
            </Link>
          );
        })}
        <Link
          href={{ pathname: `/wordbooks/${wordbookId}` }}
          className="ml-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back
        </Link>
      </div>
    </nav>
  );
}
