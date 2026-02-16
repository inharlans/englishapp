import Link from "next/link";
import type { Route } from "next";

type Props = {
  studyRate: number;
  activeDecks: number;
  staleDecks: number;
  suggestedHref: string;
  suggestedLabel: string;
};

export function LearningDashboardHeader({
  studyRate,
  activeDecks,
  staleDecks,
  suggestedHref,
  suggestedLabel
}: Props) {
  return (
    <section className="ui-card-soft p-5 ui-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ui-kicker">Learning Dashboard</p>
          <h2 className="ui-h2 mt-2">오늘 학습 상태</h2>
          <p className="ui-body mt-2">핵심 지표를 먼저 보고 바로 학습 액션으로 이동하세요.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={suggestedHref as Route} className="ui-btn-primary px-4 py-2 text-sm">
            {suggestedLabel}
          </Link>
          <Link href="/wordbooks/market" className="ui-btn-secondary px-4 py-2 text-sm">
            단어장 더 찾기
          </Link>
          <Link href="/offline" className="ui-btn-secondary px-4 py-2 text-sm">
            오프라인 보기
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <article className="ui-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">오늘 진행률</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{studyRate}%</p>
          <p className="mt-1 text-xs text-slate-600">최근 학습 상태 기준</p>
        </article>
        <article className="ui-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">활성 단어장</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{activeDecks}</p>
          <p className="mt-1 text-xs text-slate-600">다운로드/생성 포함</p>
        </article>
        <article className="ui-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">업데이트 필요</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{staleDecks}</p>
          <p className="mt-1 text-xs text-slate-600">최신 버전과 차이 있음</p>
        </article>
      </div>
    </section>
  );
}
