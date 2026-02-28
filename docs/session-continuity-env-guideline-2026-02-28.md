# 세션 이어받기 가이드 (환경변수 기준)

이 문서는 새 작업 세션에서 작업 상태를 동일 기준으로 이어가기 위한 실행 가이드입니다.

## 1) 세션 시작 전 필수 체크

- 코드 동기화
  - `git pull origin main`
  - `git status`가 깨끗한지 확인
- 템플릿/운영 가이드 동기화
  - `README.md`의 `환경 변수(운영 기준)`을 최신 참조점으로 사용
  - 세션마다 변경이 필요한 항목은 아래 공통 템플릿 문서에 반영
- 환경 변수 기준 점검
  - 로컬 점검: `.env.example`, `.env.development.example` 중심
  - 운영 기준: `README.md`의 운영 기준 목록 + 실제 배포값 비교
  - MCP 래퍼 실행 전 확인: `DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET`, `GITHUB_TOKEN`/`GH_TOKEN`/`GITHUB_PAT`, `SENTRY_ACCESS_TOKEN`, `UPSTASH_CONTEXT7_API_KEY`

## 2) 환경변수 운영 가이드(요약)

- 핵심(항상 확인):
  - `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `AUTH_SECRET`, `CRON_SECRET`, `AUTH_BOOTSTRAP_TOKEN`
- MCP 연결용:
  - `GITHUB_TOKEN` 또는 `GITHUB_PAT` 또는 `GH_TOKEN`
  - `SENTRY_ACCESS_TOKEN`
  - `UPSTASH_CONTEXT7_API_KEY`
  - `DATABASE_URL`(postgres read-only 계정 권장)
- 결제/사업자:
  - `PORTONE_API_SECRET`, `PORTONE_WEBHOOK_SECRET`, `PORTONE_STORE_ID`, `PORTONE_CHANNEL_KEY`, `PORTONE_BILLING_PHONE`
  - `COMPANY_LEGAL_NAME`~`COMPANY_SUPPORT_HOURS`
- 보안/운영 보조:
  - `INTERNAL_CRON_ALLOWED_IPS`, `PREVIEW_ACCESS_TOKEN`, `INTERNAL_E2E_ALLOWED_IPS`, `E2E_SECRET`, `E2E_TEST_EMAIL`

## 3) 세션 시작 고정 실행 커맨드(권장)

```bash
npm install
npm run compact:sync
npm run codex:workflow:check
npm run build
```

```bash
npm run ops:prod-login-check
```

## 4) 상태 전달 템플릿

- 세션 종료 전 1줄 기록
  - `마지막 점검: YYYY-MM-DD HH:mm`
  - `변경 파일: ...`
  - `핵심 게이트: compact/verify/빌드 PASS/FAIL`
  - `로그인 점검: ops:prod-login-check 결과`
- 변경 이슈/예외는 `docs/mcp-runbook.md` 또는 `docs/mcp-login-accessibility-prod-handoff-2026-02-28.md`에 날짜 기준으로 남김

## 5) 새 세션 인수인계 기준

- `README.md`의 “환경 변수(운영 기준)”를 먼저 읽고 변경 우선순위를 정함
- MCP/운영 문서는 `docs/mcp-setup-guideline-2026-02-28.md`, `docs/mcp-runbook.md`를 기준으로 진행
- 세션 간 불일치가 생기면 `.env.example`/`.env.production.example`/`.env.development.example`의 차분만 먼저 비교해 변수 누락을 해소
