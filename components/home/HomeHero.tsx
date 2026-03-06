import Link from "next/link";

import { MetricLink } from "@/components/metrics/MetricLink";
import { Badge } from "@/components/shadcn/ui/badge";
import { Card, CardContent } from "@/components/shadcn/ui/card";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

export type HeroCopyVariant = "a" | "b";

type HomeHeroProps = {
  isLoggedIn: boolean;
  copyVariant: HeroCopyVariant;
};

const HERO_COPY_BY_VARIANT: Record<
  HeroCopyVariant,
  {
    kicker: string;
    title: string;
    description: string;
    note: string;
  }
> = {
  a: {
    kicker: "집중 학습 루프",
    title: "오늘의 영어 학습을, 가장 짧고 선명한 흐름으로 끝냅니다.",
    description:
      "단어장 선택, 암기, 퀴즈, 결과 확인까지 한 번의 맥락 안에서 연결해 학습 피로를 줄이고 반복 복습을 쉽게 만듭니다.",
    note: "처음 온 사용자도 바로 학습 흐름을 이해할 수 있도록 홈 구조를 단순화했습니다.",
  },
  b: {
    kicker: "하루 10분 설계",
    title: "멈칫하지 않고 이어지는 영어 학습 경험.",
    description:
      "웹과 앱에서 같은 리듬으로 단어장을 고르고, 학습하고, 다음 행동까지 이어지도록 인터페이스를 정리했습니다.",
    note: "로그인 이후에는 최근 단어장과 추천 액션이 첫 화면에서 바로 드러납니다.",
  },
};

const QUICK_RAILS = ["3단계 학습 루프", "웹·앱 동일 흐름", "오프라인 복습 지원"] as const;

const HERO_POINTS = [
  { label: "핵심 행동", value: "학습 시작 1개" },
  { label: "탐색 비용", value: "낮은 정보 밀도" },
  { label: "학습 지속", value: "최근 흐름 이어가기" },
] as const;

const HERO_STEPS = [
  {
    title: "오늘 할 단어장을 고릅니다",
    description: "내 단어장이나 마켓 단어장에서 바로 진입할 수 있게 첫 행동을 단순화했습니다.",
  },
  {
    title: "암기와 퀴즈를 한 리듬으로 이어갑니다",
    description: "중간 판단을 줄이고 다음 행동을 항상 가장 강하게 보이도록 정리합니다.",
  },
  {
    title: "결과를 보고 바로 다음 루프로 연결합니다",
    description: "학습 완료 이후에도 복습, 이어서 학습, 오프라인 사용 같은 후속 행동이 자연스럽게 이어집니다.",
  },
] as const;

export function HomeHero({ isLoggedIn, copyVariant }: HomeHeroProps) {
  const heroCopy = HERO_COPY_BY_VARIANT[copyVariant];
  const primaryHref = isLoggedIn ? "/wordbooks" : "/login?next=/wordbooks";
  const primaryLabel = isLoggedIn ? "내 단어장으로 시작하기" : "로그인하고 학습 시작";

  return (
    <SurfaceCard className="home-bg-mesh home-hero-shell overflow-hidden px-6 py-7 md:px-8 md:py-9">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-start">
        <div>
          <Badge variant="accent">{heroCopy.kicker}</Badge>
          <h1 className="ui-h1 mt-4 max-w-[14ch] text-balance">{heroCopy.title}</h1>
          <p className="ui-body mt-4">{heroCopy.description}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
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
                className="ui-btn ui-btn--secondary ui-btn--lg"
              >
                마켓 둘러보기
              </MetricLink>
            ) : (
              <Link href="/wordbooks/market" className="ui-btn ui-btn--secondary ui-btn--lg">
                마켓 둘러보기
              </Link>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {QUICK_RAILS.map((rail) => (
              <span key={rail} className="ui-pill">
                {rail}
              </span>
            ))}
          </div>

          <p className="mt-6 text-sm leading-6 text-muted-foreground">{heroCopy.note}</p>
          {isLoggedIn ? (
            <Link
              href="/offline"
              className="mt-4 inline-flex text-sm font-semibold text-brand underline underline-offset-4"
            >
              오프라인 복습 이어가기
            </Link>
          ) : null}
        </div>

        <div className="grid gap-3">
          <Card className="border-border/70 bg-[rgba(255,255,255,0.78)]">
            <CardContent className="grid gap-3 p-5">
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {HERO_POINTS.map((point) => (
                  <div
                    key={point.label}
                    className="rounded-[1.25rem] border border-border/70 bg-[color:color-mix(in_srgb,var(--ds-color-surface-subtle)_60%,white)] px-4 py-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{point.label}</p>
                    <p className="mt-2 text-base font-semibold text-foreground">{point.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-[rgba(255,252,247,0.84)]">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ds-color-brand-secondary)]">
                오늘의 학습 구조
              </p>
              <ol className="mt-4 space-y-4">
                {HERO_STEPS.map((step, index) => (
                  <li key={step.title} className="grid grid-cols-[auto_1fr] gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--ds-color-brand-primary)_12%,white)] text-sm font-bold text-brand">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{step.title}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </SurfaceCard>
  );
}
