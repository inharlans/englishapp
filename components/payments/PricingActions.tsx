"use client";

import { useState } from "react";
import Link from "next/link";

import { confirmPayment, createCheckout, getPortalUrl, type BillingCycle } from "@/lib/api/payments";
import PortOne from "@portone/browser-sdk/v2";
import { Button } from "@/components/ui/Button";
import { Feedback } from "@/components/ui/Feedback";

export function PricingActions(props: {
  plan: "FREE" | "PRO" | null;
  paymentEnabled: boolean;
  isLoggedIn: boolean;
}) {
  const [loading, setLoading] = useState<"monthly" | "yearly" | "portal" | null>(null);
  const [error, setError] = useState("");

  const goCheckout = async (cycle: BillingCycle) => {
    setLoading(cycle);
    setError("");
    try {
      const checkoutRequest = await createCheckout(cycle);

      const issueResult = await PortOne.requestIssueBillingKey(checkoutRequest);
      if (!issueResult) {
        throw new Error("빌링키 발급 결과를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      }
      if (issueResult.code || issueResult.message) {
        throw new Error(issueResult.message ?? issueResult.code ?? "빌링키 발급에 실패했습니다.");
      }

      await confirmPayment({
        billingKey: issueResult.billingKey,
        cycle
      });

      window.location.assign("/pricing?payment=success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "결제 처리에 실패했습니다.");
    } finally {
      setLoading(null);
    }
  };

  const goPortal = async () => {
    setLoading("portal");
    setError("");
    try {
      const url = await getPortalUrl();
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "구독 관리 이동에 실패했습니다.");
    } finally {
      setLoading(null);
    }
  };

  if (!props.paymentEnabled) {
    return <p className="mt-3 text-xs text-[var(--ds-color-text-muted)]">결제 설정이 완료되지 않아 실제 결제는 현재 비활성화 상태입니다.</p>;
  }

  if (!props.isLoggedIn) {
    return (
      <div className="mt-4 space-y-2">
        <Link href={{ pathname: "/login", query: { next: "/pricing" } }} className="ui-btn ui-btn--primary ui-btn--md w-full text-center">
          로그인 후 결제하기
        </Link>
        <p className="text-xs text-[var(--ds-color-text-muted)]">실제 결제는 로그인 이후에 진행됩니다.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {props.plan === "PRO" ? (
        <Button onClick={() => void goPortal()} disabled={loading !== null} fullWidth>
          {loading === "portal" ? "처리 중…" : "구독 갱신/해지"}
        </Button>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <Button onClick={() => void goCheckout("monthly")} disabled={loading !== null} variant="primary" fullWidth>
            {loading === "monthly" ? "처리 중…" : "월간 구독 시작"}
          </Button>
          <Button onClick={() => void goCheckout("yearly")} disabled={loading !== null} variant="secondary" fullWidth>
            {loading === "yearly" ? "처리 중…" : "연간 구독 시작"}
          </Button>
        </div>
      )}
      {error ? (
        <Feedback tone="danger" live>{error}</Feedback>
      ) : null}
    </div>
  );
}
