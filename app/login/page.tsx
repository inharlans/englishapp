"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { LoginPanel } from "@/components/auth/LoginPanel";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  google_not_configured: "구글 로그인이 아직 설정되지 않았습니다.",
  google_state_mismatch: "구글 로그인 상태 검증에 실패했습니다. 다시 시도해주세요.",
  google_token_exchange_failed: "구글 토큰 교환에 실패했습니다. 잠시 후 다시 시도해주세요.",
  google_profile_fetch_failed: "구글 계정 정보를 가져오지 못했습니다.",
  google_email_not_verified: "이메일 인증된 구글 계정으로 다시 시도해주세요.",
  google_callback_failed: "구글 로그인 처리 중 오류가 발생했습니다.",
  google_already_linked_other_account: "이미 다른 계정에 연결된 구글 계정입니다.",
  google_profile_missing_id: "구글 계정 식별자 확인에 실패했습니다.",
  google_link_failed: "구글 계정 연결 처리 중 오류가 발생했습니다.",
  naver_not_configured: "네이버 로그인이 아직 설정되지 않았습니다.",
  naver_state_mismatch: "네이버 로그인 상태 검증에 실패했습니다. 다시 시도해주세요.",
  naver_token_exchange_failed: "네이버 토큰 교환에 실패했습니다. 잠시 후 다시 시도해주세요.",
  naver_profile_fetch_failed: "네이버 계정 정보를 가져오지 못했습니다.",
  naver_email_required: "네이버 계정 이메일 제공 동의가 필요합니다.",
  naver_already_linked_other_account: "이미 다른 계정에 연결된 네이버 계정입니다.",
  naver_callback_failed: "네이버 로그인 처리 중 오류가 발생했습니다.",
  naver_link_failed: "네이버 계정 연결 처리 중 오류가 발생했습니다.",
  kakao_not_configured: "카카오 로그인이 아직 설정되지 않았습니다.",
  kakao_state_mismatch: "카카오 로그인 상태 검증에 실패했습니다. 다시 시도해주세요.",
  kakao_token_exchange_failed: "카카오 토큰 교환에 실패했습니다. 잠시 후 다시 시도해주세요.",
  kakao_profile_fetch_failed: "카카오 계정 정보를 가져오지 못했습니다.",
  kakao_email_required: "카카오 계정 이메일 제공 동의가 필요합니다.",
  kakao_already_linked_other_account: "이미 다른 계정에 연결된 카카오 계정입니다.",
  kakao_callback_failed: "카카오 로그인 처리 중 오류가 발생했습니다.",
  kakao_link_failed: "카카오 계정 연결 처리 중 오류가 발생했습니다."
};

function normalizeNextPath(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  return raw;
}

function LoginInner() {
  const searchParams = useSearchParams();
  const nextPath = normalizeNextPath(searchParams.get("next"));
  const errorCode = searchParams.get("error") || "";
  const oauthError = OAUTH_ERROR_MESSAGES[errorCode] ?? "";

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
    <Suspense fallback={<p className="text-sm text-slate-700" role="status" aria-live="polite">불러오는 중...</p>}>
      <LoginInner />
    </Suspense>
  );
}

