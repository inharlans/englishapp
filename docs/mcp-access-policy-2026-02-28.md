# MCP Access Policy (2026-02-28)

## 목적
- `englishapp`에서 사용할 MCP를 최소 권한 원칙으로 운영한다.
- 야간 Ralph-Lite 자동화와 수동 코드 검토 흐름에서 보안/안정성을 유지한다.
- 운영 장애 분석, DB 검증, 브라우저 회귀 점검을 빠르게 수행할 수 있게 한다.

## 범위
- Codex/CLI 세션에서 사용하는 MCP 서버
- 토큰/권한/환경분리 정책
- 단계별 도입 기준과 검증 체크리스트

## MCP 분류

### A. Core (상시 권장)
- `github/github-mcp-server`
- `postgres`
- `prisma/mcp`
- `upstash/context7`
- `microsoft/playwright-mcp`
- `ChromeDevTools/chrome-devtools-mcp`
- `getsentry/sentry-mcp`

### B. Conditional (필요 시 활성)
- `task-master-ai`
- `sequential-thinking`
- `neondatabase/mcp-server-neon`
- `bytebase/dbhub`
- `browserbase/mcp-server-browserbase`
- `cloudflare/mcp-server-cloudflare`
- `atlassian/atlassian-mcp-server`

### C. Deferred (현 시점 보류)
- `remotion-documentation`
- `elevenlabs`
- `replicate`
- `redis/mcp-redis-cloud`
- `hashicorp/terraform-mcp-server`
- `qdrant/mcp-server-qdrant`

## 최소 권한 정책

### GitHub MCP
- 목적: 이슈/PR/체크 상태 조회 및 제한적 협업 자동화
- 최소 권한:
  - repo read
  - actions read
- 선택 권한:
  - issues write
  - pull requests write
- 금지:
  - admin 범위 권한
  - org 전역 write 과권한

### Postgres MCP
- 목적: 스키마/데이터 검증
- 최소 권한:
  - production read-only 계정(SELECT만)
- 선택 권한:
  - staging에서 제한적 write
- 금지:
  - production DDL/DROP/TRUNCATE

### Prisma MCP
- 목적: schema/migration 검토
- 최소 권한:
  - schema 읽기
  - migration 상태 조회
- 선택 권한:
  - development/staging에서 migration 실행
- 금지:
  - production DB 자동 migration 실행

### Context7 MCP
- 목적: Next/Prisma/Playwright 최신 문서 참조
- 최소 권한:
  - read-only API key
- 금지:
  - 조직/결제 관리 권한 결합

### Playwright MCP
- 목적: UI 회귀/접근성 점검
- 최소 권한:
  - 테스트 계정/테스트 URL 접근
- 금지:
  - 운영 관리자 계정 토큰 영구 저장

### Chrome DevTools MCP
- 목적: 콘솔/네트워크/성능 디버깅
- 최소 권한:
  - 로컬 디버깅 세션
- 금지:
  - 민감 쿠키/헤더 원문 장기 저장

### Sentry MCP
- 목적: 운영 에러 원인 분석
- 최소 권한:
  - issue/event read
- 선택 권한:
  - issue 상태 변경 write(필요 시)
- 금지:
  - 조직 설정/멤버 관리 권한

## 운영 프로필

### 기본 개발 프로필 (상시)
- github, postgres(read), prisma(read), context7, playwright, chrome-devtools

### 운영 장애 프로필 (필요 시)
- 기본 개발 프로필 + sentry(read)

### 고난도 분석 프로필 (선택)
- 기본 개발 프로필 + task-master-ai + sequential-thinking

## 도입 순서
1. read-only 연결
2. 샘플 조회 테스트(GitHub/DB/Docs/Browser/Sentry)
3. 민감정보 로그 마스킹 검증
4. 1주 운영 후 필요한 MCP만 write 권한 제한 오픈
5. PR 자동 생성은 계속 OFF 유지

## 필수 가드레일
- `main` 직접 변경 금지, 브랜치 기반 작업 유지
- 야간 자동화는 검증/리포트 중심(배포/시크릿/파괴성 작업 금지)
- 토큰 최소 권한 + 주기적 로테이션
- 실패 시 자동 중단 및 원인 기록

## 실행 체크리스트

### 연결 전
- [ ] MCP별 owner 지정
- [ ] 토큰 저장 위치(비밀 저장소) 확정
- [ ] production/staging 분리 계정 준비

### 연결 직후
- [ ] 각 MCP health check 수행
- [ ] read-only 동작 확인
- [ ] 로그에 민감정보 노출 여부 점검

### 1주 운영 후
- [ ] 실제 사용 빈도 리뷰
- [ ] 불필요 MCP 비활성화
- [ ] write 권한 필요 MCP만 제한적 승격
