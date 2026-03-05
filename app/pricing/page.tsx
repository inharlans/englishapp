import Link from "next/link";
import { cookies } from "next/headers";

import { PricingActions } from "@/components/payments/PricingActions";
import { Feedback } from "@/components/ui/Feedback";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { getUserFromRequestCookies } from "@/lib/authServer";
import { getBusinessInfo } from "@/lib/businessInfo";
import { FREE_DOWNLOAD_WORD_LIMIT, getUserDownloadedWordCount } from "@/lib/planLimits";
import { getPortOneConfig } from "@/lib/payments";

function planLabel(plan: "FREE" | "PRO"): string {
  return plan === "FREE" ? "무료" : "프로";
}

export default async function PricingPage(props: { searchParams: Promise<{ payment?: string }> }) {
  const sp = await props.searchParams;
  const user = await getUserFromRequestCookies(await cookies());
  const business = getBusinessInfo();

  const downloadWordsUsed = user ? await getUserDownloadedWordCount(user.id) : null;
  const paymentEnabled = Boolean(getPortOneConfig());
  const supportEmail = business.supportEmail || "준비 중";
  const supportPhone = business.supportPhone || "준비 중";

  return (
    <section className="space-y-5">
      <SurfaceCard className="p-6">
        <p className="ui-kicker">요금제</p>
        <h1 className="ui-h1 mt-3 text-balance">학습 흐름을 끊지 않는 플랜을 선택하세요</h1>
        <p className="ui-body mt-3">핵심 기능은 무료로 시작하고, 필요 시 프로로 확장할 수 있습니다.</p>

        <div className="mt-4">
          {user ? (
            <Link href="/wordbooks" className="ui-btn ui-btn--primary ui-btn--lg">
              내 학습 계속하기
            </Link>
          ) : (
            <Link href="/login?next=/pricing" className="ui-btn ui-btn--primary ui-btn--lg">
              로그인 후 결제하기
            </Link>
          )}
        </div>

        <nav className="mt-4 flex flex-wrap gap-4 text-sm text-[var(--ds-color-text-muted)]" aria-label="요금제 보조 링크">
          <Link href="/privacy" className="underline underline-offset-4">
            개인정보처리방침
          </Link>
          <Link href="/terms" className="underline underline-offset-4">
            서비스 이용약관
          </Link>
        </nav>
      </SurfaceCard>

      {sp.payment === "success" ? (
        <Feedback tone="success" live>
          결제가 완료되었습니다. 구독 상태가 자동 반영됩니다.
        </Feedback>
      ) : null}
      {sp.payment === "cancel" ? (
        <Feedback tone="warning" live>
          결제가 취소되었습니다. 필요하면 다시 시도하세요.
        </Feedback>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <SurfaceCard className="p-5">
          <p className="text-xs font-semibold text-[var(--ds-color-text-muted)]">무료</p>
          <p className="mt-2 text-3xl font-black text-[var(--ds-color-text)]">0원</p>
          <ul className="mt-3 space-y-1 text-sm text-[var(--ds-color-text-muted)]">
            <li>다운로드: 누적 {FREE_DOWNLOAD_WORD_LIMIT}단어</li>
            <li>단어장 생성: 1개</li>
            <li>업로드: 공개 고정</li>
          </ul>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <p className="text-xs font-semibold text-[var(--ds-color-text-muted)]">프로</p>
          <p className="mt-2 text-3xl font-black text-[var(--ds-color-text)]">월 2,900원</p>
          <p className="mt-1 text-sm font-semibold text-[var(--ds-color-text)]">연 29,000원</p>
          <ul className="mt-3 space-y-1 text-sm text-[var(--ds-color-text-muted)]">
            <li>다운로드: 무제한</li>
            <li>단어장 생성: 무제한</li>
            <li>업로드: 공개/비공개 선택</li>
          </ul>
          <PricingActions plan={user?.plan ?? null} paymentEnabled={paymentEnabled} isLoggedIn={Boolean(user)} />
        </SurfaceCard>
      </div>

      <SurfaceCard className="p-4">
        <p className="text-sm font-semibold text-[var(--ds-color-text)]">현재 상태</p>
        <p className="mt-2 text-sm text-[var(--ds-color-text-muted)]">
          {user
            ? `현재 요금제: ${planLabel(user.plan)}${
                user.plan === "FREE" && typeof downloadWordsUsed === "number"
                  ? ` · 다운로드 사용량 ${downloadWordsUsed}/${FREE_DOWNLOAD_WORD_LIMIT}단어`
                  : ""
              }`
            : "로그인 없이 가격 확인 가능, 실제 결제는 로그인 이후 진행됩니다."}
        </p>
      </SurfaceCard>

      <SurfaceCard className="p-4">
        <p className="text-sm font-semibold text-[var(--ds-color-text)]">상품/결제/환불 안내</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--ds-color-text-muted)]">
          <li>상품명: Oing PRO 구독권(디지털 서비스)</li>
          <li>결제금액: 월 2,900원 / 연 29,000원 (부가세 포함)</li>
          <li>제공방식: 결제 즉시 계정 권한(PRO) 활성화, 물리 배송 없음</li>
          <li>해지정책: 구독 해지 시 다음 결제일부터 자동 청구 중단</li>
          <li>환불정책: 전자상거래법 및 결제사 정책에 따라 처리(고객센터 접수 후 검토)</li>
        </ul>
      </SurfaceCard>

      <Feedback tone="info">고객센터: {supportEmail} / {supportPhone}{business.supportHours ? ` (${business.supportHours})` : ""}</Feedback>
    </section>
  );
}
