"use client";

import { useState } from "react";

import { apiFetch } from "@/lib/clientApi";

export function PricingActions(props: { plan: "FREE" | "PRO" | null; paymentEnabled: boolean }) {
  const [loading, setLoading] = useState<"monthly" | "yearly" | "portal" | null>(null);
  const [error, setError] = useState("");

  const goCheckout = async (cycle: "monthly" | "yearly") => {
    setLoading(cycle);
    setError("");
    try {
      const res = await apiFetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycle })
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "결제 페이지 이동에 실패했습니다.");
      window.location.assign(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "결제 페이지 이동에 실패했습니다.");
    } finally {
      setLoading(null);
    }
  };

  const goPortal = async () => {
    setLoading("portal");
    setError("");
    try {
      const res = await apiFetch("/api/payments/portal", { method: "POST" });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "구독 관리 페이지 이동에 실패했습니다.");
      window.location.assign(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "구독 관리 페이지 이동에 실패했습니다.");
    } finally {
      setLoading(null);
    }
  };

  if (!props.paymentEnabled) {
    return (
      <p className="mt-3 text-xs text-slate-500">
        결제 키가 설정되지 않아 실제 결제는 비활성화 상태입니다.
      </p>
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
          {loading === "portal" ? "이동 중..." : "구독 관리"}
        </button>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            className="ui-btn-accent w-full px-4 py-2.5 text-sm disabled:opacity-60"
            onClick={() => void goCheckout("monthly")}
            disabled={loading !== null}
          >
            {loading === "monthly" ? "이동 중..." : "월간 구독 시작"}
          </button>
          <button
            type="button"
            className="ui-btn-primary w-full px-4 py-2.5 text-sm disabled:opacity-60"
            onClick={() => void goCheckout("yearly")}
            disabled={loading !== null}
          >
            {loading === "yearly" ? "이동 중..." : "연간 구독 시작"}
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
