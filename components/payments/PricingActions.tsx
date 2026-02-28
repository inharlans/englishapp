"use client";

import { useState } from "react";
import Link from "next/link";

import { confirmPayment, createCheckout, getPortalUrl, type BillingCycle } from "@/lib/api/payments";
import PortOne from "@portone/browser-sdk/v2";

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
    return <p className="mt-3 text-xs text-slate-500">결제 키가 설정되지 않아 실제 결제는 비활성화 상태입니다.</p>;
  }

  if (!props.isLoggedIn) {
    return (
      <div className="mt-4 space-y-2">
        <Link href={{ pathname: "/login", query: { next: "/pricing" } }} className="ui-btn-primary block w-full px-4 py-2.5 text-center text-sm">
          로그인 후 결제하기
        </Link>
        <p className="text-xs text-slate-500">실제 결제는 로그인 이후에 진행됩니다.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {props.plan === "PRO" ? (
        <button
          type="button"
          className="ui-btn-primary w-full px-4 py-2.5 text-sm disabled:opacity-60"
          onClick={() => void goPortal()}
          disabled={loading !== null}
        >
          {loading === "portal" ? "처리 중..." : "구독 갱신/해지"}
        </button>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            className="ui-btn-accent w-full px-4 py-2.5 text-sm disabled:opacity-60"
            onClick={() => void goCheckout("monthly")}
            disabled={loading !== null}
          >
            {loading === "monthly" ? "처리 중..." : "월간 구독 시작"}
          </button>
          <button
            type="button"
            className="ui-btn-primary w-full px-4 py-2.5 text-sm disabled:opacity-60"
            onClick={() => void goCheckout("yearly")}
            disabled={loading !== null}
          >
            {loading === "yearly" ? "처리 중..." : "연간 구독 시작"}
          </button>
        </div>
      )}
      {error ? (
        <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
