# Auth Login Policy Follow-up (2026-02-26)

- [x] Production 비밀번호 로그인 정책 확정
  - `/api/auth/login`은 운영에서 admin 이메일만 허용, 일반 사용자는 OAuth 전용으로 유지
  - 비차별 응답(uniform response)은 별도 보안 태스크로 분리하고 현재 정책은 `PASSWORD_LOGIN_DISABLED` 코드 유지
- [x] `PASSWORD_LOGIN_DISABLED` 모니터링/임계치 런북 반영
  - 반영 위치: `docs/OPERATIONS.md` 8) 로그인 정책 모니터링
- [x] production 유사 모드 회귀 테스트 추가
  - `app/api/auth/login/route.test.ts`
  - `NODE_ENV=production`에서 비관리자 비밀번호 로그인 차단(`403`) 검증
