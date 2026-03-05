import Link from "next/link";

import { MetricLink } from "@/components/metrics/MetricLink";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

export type HeroCopyVariant = "a" | "b";

type HomeHeroProps = {
  isLoggedIn: boolean;
  copyVariant: HeroCopyVariant;
};

const HERO_COPY_BY_VARIANT: Record<HeroCopyVariant, { kicker: string; title: string; description: string }> = {
  a: {
    kicker: "집중 학습",
    title: "오늘 할 학습 하나만 끝내면 됩니다.",
    description: "단어장 선택부터 결과 확인까지 한 흐름으로 이어져, 10분 안에 오늘 복습을 마칩니다."
  },
  b: {
    kicker: "오늘 10분",
    title: "지금 한 세션만 끝내세요.",
    description: "열고, 암기하고, 확인하는 3단계를 바로 진행해 오늘 학습을 끝냅니다."
  }
};

const QUICK_RAILS = ["10분 집중 루틴", "한 번에 1개 목표", "모바일/데스크톱 동일 흐름"] as const;

const HERO_STEPS = [
  {
    title: "오늘의 단어장 고르기",
    description: "내 단어장 또는 마켓에서 학습 대상을 하나만 선택합니다."
  },
  {
    title: "즉시 암기 세션 시작",
    description: "핵심 단어를 끊김 없이 반복하며 오늘 분량을 끝냅니다."
  },
  {
    title: "결과 확인 후 종료",
    description: "오늘 학습 성과를 보고 다음 복습 타이밍만 정리합니다."
  }
] as const;

export function HomeHero({ isLoggedIn, copyVariant }: HomeHeroProps) {
  const heroCopy = HERO_COPY_BY_VARIANT[copyVariant];
  const primaryHref = isLoggedIn ? "/wordbooks" : "/login?next=/wordbooks";
  const primaryLabel = isLoggedIn ? "학습 시작" : "로그인하고 학습 시작";

  return (
    <SurfaceCard className="home-bg-mesh home-hero-shell overflow-hidden p-6 md:p-10">
      <div className="grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] md:gap-6">
        <div>
          <p className="ui-kicker">{heroCopy.kicker}</p>
          <h1 className="ui-h1 mt-3 max-w-[18ch] text-balance">{heroCopy.title}</h1>
          <p className="ui-body mt-4 max-w-[56ch]">{heroCopy.description}</p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            {isLoggedIn ? (
              <MetricLink
                href={primaryHref}
                metricName="metric.home_cta_click"
                metricPayload={{ cta: "hero_user_wordbooks", page: "home", variant: copyVariant }}
                className="ui-btn ui-btn--primary ui-btn--lg"
              >
                {primaryLabel}
              </MetricLink>
            ) : (
              <Link href={primaryHref} className="ui-btn ui-btn--primary ui-btn--lg">
                {primaryLabel}
              </Link>
            )}

            {isLoggedIn ? (
              <MetricLink
                href="/wordbooks/market"
                metricName="metric.home_cta_click"
                metricPayload={{ cta: "hero_user_market", page: "home", variant: copyVariant }}
                className="text-sm font-semibold text-[var(--ds-color-brand-primary)] underline underline-offset-4"
              >
                단어장 마켓 보기
              </MetricLink>
            ) : (
              <Link href="/wordbooks/market" className="text-sm font-semibold text-[var(--ds-color-brand-primary)] underline underline-offset-4">
                단어장 마켓 보기
              </Link>
            )}
          </div>

          <ul className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-[var(--ds-color-text-muted)]">
            {QUICK_RAILS.map((rail) => (
              <li key={rail} className="rounded-full border border-[var(--ds-color-border)] px-3 py-1">
                {rail}
              </li>
            ))}
          </ul>
        </div>

        <aside className="rounded-2xl border border-[var(--ds-color-border)] bg-[var(--ds-color-surface-raised)] p-5 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.14em] text-[var(--ds-color-text-muted)]">오늘 학습 흐름</p>
          <ol className="mt-4 space-y-4">
            {HERO_STEPS.map((step, index) => (
              <li key={step.title} className="border-l-2 border-[var(--ds-color-border)] pl-3">
                <p className="text-xs font-bold text-[var(--ds-color-info)]">{index + 1}단계</p>
                <p className="mt-1 text-sm font-semibold text-[var(--ds-color-text)]">{step.title}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--ds-color-text-muted)]">{step.description}</p>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </SurfaceCard>
  );
}
