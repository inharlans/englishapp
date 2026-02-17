"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { LoginPanel } from "@/components/auth/LoginPanel";

function LoginInner() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";
  const errorCode = searchParams.get("error") || "";

  const oauthError =
    errorCode === "google_not_configured"
      ? "구글 로그인이 아직 설정되지 않았습니다."
      : errorCode === "google_state_mismatch"
        ? "구글 로그인 상태 검증에 실패했습니다. 다시 시도해주세요."
        : errorCode === "google_token_exchange_failed"
          ? "구글 토큰 교환에 실패했습니다. 잠시 후 다시 시도해주세요."
          : errorCode === "google_profile_fetch_failed"
            ? "구글 계정 정보를 가져오지 못했습니다."
            : errorCode === "google_email_not_verified"
              ? "이메일 인증된 구글 계정으로 다시 시도해주세요."
              : errorCode === "google_callback_failed"
                ? "구글 로그인 처리 중 오류가 발생했습니다."
                : "";

  return (
    <section className="mx-auto max-w-md">
      <LoginPanel
        nextPath={nextPath}
        title="로그인"
        subtitle="앱과 API를 사용하려면 로그인하세요."
        oauthError={oauthError}
      />
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-700">불러오는 중...</p>}>
      <LoginInner />
    </Suspense>
  );
}

