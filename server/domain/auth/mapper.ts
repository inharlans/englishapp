import type { MeResponsePayload } from "@/server/domain/auth/contracts";

export function toUnauthorizedMessage() {
  return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
}

export function toAuthMeResponse(payload: MeResponsePayload) {
  return payload;
}

