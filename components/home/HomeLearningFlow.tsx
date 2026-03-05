import { SurfaceCard } from "@/components/ui/SurfaceCard";

const FLOW_ITEMS = [
  {
    title: "목록 확인",
    description: "내 단어장 또는 마켓에서 오늘 학습 대상을 고릅니다."
  },
  {
    title: "학습 진행",
    description: "선택한 단어장으로 바로 암기 세션에 진입합니다."
  },
  {
    title: "결과 정리",
    description: "퀴즈 결과를 보고 다음 복습 대상을 정리합니다."
  }
] as const;

export function HomeLearningFlow() {
  return (
    <SurfaceCard className="p-5 md:p-7">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="ui-kicker">학습 루틴</p>
          <h2 className="ui-h2 mt-2 text-balance">3단계면 오늘 학습이 끝납니다.</h2>
        </div>
        <p className="text-sm text-[var(--ds-color-text-muted)]">한 번에 이해되는 고정 흐름으로 집중도를 유지합니다.</p>
      </div>

      <ol className="mt-6 grid gap-3 md:grid-cols-3 md:gap-4">
        {FLOW_ITEMS.map((item, index) => (
          <li key={item.title} className="rounded-xl border border-[var(--ds-color-border)] bg-[var(--ds-color-surface-raised)] p-4">
            <p className="text-xs font-semibold text-[var(--ds-color-text-muted)]">{index + 1}단계</p>
            <p className="mt-1 text-base font-bold text-[var(--ds-color-text)]">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--ds-color-text-muted)]">{item.description}</p>
          </li>
        ))}
      </ol>
    </SurfaceCard>
  );
}
