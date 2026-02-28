import type { MeResponsePayload } from "@/server/domain/auth/contracts";

export function toUnauthorizedMessage() {
  return {
    ok: false,
    code: "INVALID_CREDENTIALS",
    message: "이메일 또는 비밀번호가 올바르지 않습니다.",
    error: "이메일 또는 비밀번호가 올바르지 않습니다."
  };
}

export function toPasswordLoginDisabledMessage() {
  return {
    ok: false,
    code: "PASSWORD_LOGIN_DISABLED",
    message: "이 서비스는 OAuth 로그인만 지원합니다.",
    error: "이 서비스는 OAuth 로그인만 지원합니다."
  };
}

export function toAuthMeResponse(payload: MeResponsePayload) {
  return payload;
}
