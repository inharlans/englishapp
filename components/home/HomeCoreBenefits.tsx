import { SurfaceCard } from "@/components/ui/SurfaceCard";

const BENEFITS = [
  {
    title: "시작이 빠릅니다",
    description: "로그인 직후 곧바로 학습 가능한 경로를 첫 화면에 고정했습니다."
  },
  {
    title: "복습 판단이 선명합니다",
    description: "오늘 해야 할 행동과 완료 지점을 짧은 문장으로 분리해 보여줍니다."
  },
  {
    title: "확장은 필요할 때만",
    description: "마켓, 클리퍼, 오프라인 복습은 학습 흐름을 방해하지 않게 뒤에 배치합니다."
  }
] as const;

export function HomeCoreBenefits() {
  return (
    <SurfaceCard className="p-5 md:p-7">
      <p className="ui-kicker">핵심 설명</p>
      <h2 className="ui-h2 mt-2 text-balance">비어 보이지 않지만 산만하지 않은 구조</h2>

      <div className="mt-6 grid gap-3 md:grid-cols-3 md:gap-4">
        {BENEFITS.map((benefit) => (
          <article key={benefit.title} className="rounded-xl border border-[var(--ds-color-border)] bg-[var(--ds-color-surface)] p-4">
            <p className="text-base font-bold text-[var(--ds-color-text)]">{benefit.title}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--ds-color-text-muted)]">{benefit.description}</p>
          </article>
        ))}
      </div>
    </SurfaceCard>
  );
}
