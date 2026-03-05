import Link from "next/link";
import { cookies } from "next/headers";

import { AdSlot } from "@/components/ads/AdSlot";
import { MetricLink } from "@/components/metrics/MetricLink";
import { Feedback } from "@/components/ui/Feedback";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { getAdsConfig } from "@/lib/ads/slots";
import { getUserFromRequestCookies } from "@/lib/authServer";

export default async function HomePage() {
  const user = await getUserFromRequestCookies(await cookies());
  const adsConfig = getAdsConfig();

  return (
    <section className="space-y-5">
      <SurfaceCard className="p-6">
        <p className="ui-kicker">오늘 학습</p>
        <h1 className="ui-h1 mt-3 text-balance">지금 해야 할 학습 하나에만 집중하세요</h1>
        <p className="ui-body mt-3">목록에서 단어장을 고르고, 바로 학습을 시작한 뒤 결과를 확인하는 흐름으로 진행합니다.</p>

        <div className="mt-5">
          {user ? (
            <MetricLink
              href="/wordbooks"
              metricName="metric.home_cta_click"
              metricPayload={{ cta: "hero_user_wordbooks", page: "home" }}
              className="ui-btn ui-btn--primary ui-btn--lg"
            >
              학습 시작
            </MetricLink>
          ) : (
            <Link href="/login?next=/wordbooks" className="ui-btn ui-btn--primary ui-btn--lg">
              로그인하고 학습 시작
            </Link>
          )}
        </div>

        <nav aria-label="보조 이동" className="mt-4 flex flex-wrap gap-4 text-sm text-[var(--ds-color-text-muted)]">
          {user ? (
            <MetricLink
              href="/wordbooks/market"
              metricName="metric.home_cta_click"
              metricPayload={{ cta: "hero_user_market", page: "home" }}
              className="underline underline-offset-4"
            >
              마켓 보기
            </MetricLink>
          ) : (
            <Link href="/wordbooks/market" className="underline underline-offset-4">
              마켓 보기
            </Link>
          )}
          <Link href="/pricing" className="underline underline-offset-4">
            요금제 보기
          </Link>
          {user ? (
            <MetricLink
              href="/clipper/extension"
              metricName="metric.home_cta_click"
              metricPayload={{ cta: "hero_user_clipper", page: "home" }}
              className="underline underline-offset-4"
            >
              클리퍼 설치
            </MetricLink>
          ) : (
            <Link href="/clipper/extension" className="underline underline-offset-4">
              클리퍼 설치
            </Link>
          )}
          {user ? (
            <MetricLink
              href="/offline"
              metricName="metric.home_cta_click"
              metricPayload={{ cta: "hero_user_offline", page: "home" }}
              className="underline underline-offset-4"
            >
              오프라인 복습
            </MetricLink>
          ) : null}
        </nav>
      </SurfaceCard>

      <div className="grid gap-3 md:grid-cols-3">
        <SurfaceCard className="p-4">
          <p className="text-xs font-semibold text-[var(--ds-color-text-muted)]">1단계</p>
          <h2 className="mt-1 text-base font-bold text-[var(--ds-color-text)]">목록 확인</h2>
          <p className="mt-1 text-sm text-[var(--ds-color-text-muted)]">내 단어장 또는 마켓에서 오늘 학습 대상을 고릅니다.</p>
        </SurfaceCard>
        <SurfaceCard className="p-4">
          <p className="text-xs font-semibold text-[var(--ds-color-text-muted)]">2단계</p>
          <h2 className="mt-1 text-base font-bold text-[var(--ds-color-text)]">학습 시작</h2>
          <p className="mt-1 text-sm text-[var(--ds-color-text-muted)]">암기 세션으로 바로 진입해 핵심 단어를 반복합니다.</p>
        </SurfaceCard>
        <SurfaceCard className="p-4">
          <p className="text-xs font-semibold text-[var(--ds-color-text-muted)]">3단계</p>
          <h2 className="mt-1 text-base font-bold text-[var(--ds-color-text)]">결과 확인</h2>
          <p className="mt-1 text-sm text-[var(--ds-color-text-muted)]">퀴즈 결과를 보고 다음 복습 대상을 정리합니다.</p>
        </SurfaceCard>
      </div>

      <Feedback tone="info" live>
        핵심 행동은 하나만 먼저 선택하세요. 추천: 단어장 열기 → 학습 시작
      </Feedback>

      <AdSlot
        slot="HOME_BANNER"
        enabled={adsConfig.enabled}
        client={adsConfig.client}
        unitId={adsConfig.unitIds.HOME_BANNER}
      />
    </section>
  );
}
