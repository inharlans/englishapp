import Link from "next/link";

import { MetricLink } from "@/components/metrics/MetricLink";
import type { HeroCopyVariant } from "./HomeHero";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

const TRUST_POINTS = [
  {
    title: "핵심 행동 고정",
    description: "첫 화면에서 바로 학습 시작까지 이어지는 단일 CTA를 유지합니다."
  },
  {
    title: "학습 중심 배치",
    description: "부가 기능은 분리하고, 기본 학습 흐름은 상단에 우선 배치했습니다."
  },
  {
    title: "디바이스 일관성",
    description: "모바일과 데스크톱 모두 같은 정보 구조로 이해 시간을 줄였습니다."
  }
] as const;

type HomeTrustPanelProps = {
  isLoggedIn: boolean;
  copyVariant: HeroCopyVariant;
};

export function HomeTrustPanel({ isLoggedIn, copyVariant }: HomeTrustPanelProps) {
  return (
    <SurfaceCard className="bg-[var(--ds-color-surface-raised)] p-5 md:p-7">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
        <div>
          <p className="ui-kicker">신뢰 포인트</p>
          <h2 className="ui-h2 mt-2 text-balance">첫 화면 3초 안에 가치와 행동을 이해하도록 정리했습니다.</h2>
          <p className="ui-body mt-4 max-w-[56ch]">
            메시지는 하나, 행동은 하나, 보조 이동은 하나로 줄여 인지 부담을 낮추고 학습 전환율을 높이는 데 집중했습니다.
          </p>

          {isLoggedIn ? (
            <p className="mt-4 text-sm text-[var(--ds-color-text-muted)]">
              이미 학습 중이라면{" "}
              <MetricLink
                href="/offline"
                metricName="metric.home_cta_click"
                metricPayload={{ cta: "hero_user_offline", page: "home", variant: copyVariant }}
                className="font-semibold text-[var(--ds-color-brand-primary)] underline underline-offset-4"
              >
                오프라인 복습
              </MetricLink>
              으로 바로 이어갈 수 있습니다.
            </p>
          ) : null}

          <nav aria-label="추가 이동" className="mt-5 flex flex-wrap gap-4 text-sm text-[var(--ds-color-text-muted)]">
            <Link href="/pricing" className="underline underline-offset-4">
              요금제 보기
            </Link>
            {isLoggedIn ? (
              <MetricLink
                href="/clipper/extension"
                metricName="metric.home_cta_click"
                metricPayload={{ cta: "hero_user_clipper", page: "home", variant: copyVariant }}
                className="underline underline-offset-4"
              >
                확장자 설치
              </MetricLink>
            ) : (
              <Link href="/clipper/extension" className="underline underline-offset-4">
                확장자 설치
              </Link>
            )}
          </nav>
        </div>

        <ul className="space-y-3">
          {TRUST_POINTS.map((point) => (
            <li key={point.title} className="rounded-xl border border-[var(--ds-color-border)] bg-[var(--ds-color-surface)] p-4">
              <p className="text-sm font-bold text-[var(--ds-color-text)]">{point.title}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--ds-color-text-muted)]">{point.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </SurfaceCard>
  );
}
