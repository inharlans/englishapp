import type { Metadata } from "next";

import { LEGACY_ROUTE_POLICIES } from "@/lib/legacy-compat";

export const metadata: Metadata = {
  title: "레거시 경로 정책 | Englishapp"
};

const policies = [
  LEGACY_ROUTE_POLICIES.apiQuizSubmit,
  LEGACY_ROUTE_POLICIES.apiWords,
  LEGACY_ROUTE_POLICIES.apiWordsById,
  LEGACY_ROUTE_POLICIES.apiWordsImport,
  LEGACY_ROUTE_POLICIES.pageQuizWord,
  LEGACY_ROUTE_POLICIES.pageQuizMeaning,
  LEGACY_ROUTE_POLICIES.pageListCorrect,
  LEGACY_ROUTE_POLICIES.pageListWrong,
  LEGACY_ROUTE_POLICIES.pageListHalf
];

const policyAnchorByRoute: Record<string, string> = {
  "/api/quiz/submit": "api-quiz-submit",
  "/api/words": "api-words",
  "/api/words/{id}": "api-words-id",
  "/api/words/import": "api-words-import"
};

export default function LegacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">레거시 경로 호환 정책</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        아래 경로는 호환성을 위해 유지 중이며, 제거 전까지 호출량을 관측합니다. 신규 구현은 대체 경로를 사용하세요.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/30 text-left">
              <th className="px-3 py-2 font-medium">대상 경로</th>
              <th className="px-3 py-2 font-medium">대체 경로</th>
              <th className="px-3 py-2 font-medium">처리 방식</th>
              <th className="px-3 py-2 font-medium">유지 기간</th>
              <th className="px-3 py-2 font-medium">제거 예정일</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((policy) => (
              <tr key={policy.route} id={policyAnchorByRoute[policy.route]} className="border-t align-top">
                <td className="px-3 py-2 font-mono text-xs">{policy.route}</td>
                <td className="px-3 py-2 font-mono text-xs">{policy.replacement}</td>
                <td className="px-3 py-2">{policy.handling}</td>
                <td className="px-3 py-2">{policy.keepUntil}</td>
                <td className="px-3 py-2">{policy.removeAfter}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        관측 이벤트: <code>legacy_route_access</code> (JSON 로그)
      </p>
    </main>
  );
}
