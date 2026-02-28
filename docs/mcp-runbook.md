# MCP 운영 Runbook (chrome-devtools 기준)

## 1) 개요/목적
- 실서비스 `https://www.oingapp.com` 브라우저 점검을 위해 chrome-devtools MCP를 기준으로 `Regression Smoke v1`/`Ops Debug v1`를 일관되게 수행한다.
- 운영 원칙: 읽기 중심 점검, 비파괴 실행, 브랜치 기반 운영 반영(운영 리포트 후 수동 승인).
- 본 문서는 연결 점검, 실행 절차, 결함 우선순위, MCP 확장 계획까지 한 번에 운영할 수 있게 구성한다.

## 2) 현재 활성 MCP 상태 (최근 기준)
- 브라우저: Edge DevTools MCP 대상 탭 고정됨 (`https://www.oingapp.com/`)
- 연결 점검: `http://127.0.0.1:9333/json`으로 디버깅 엔드포인트 확인
- 활성 MCP: chrome-devtools/github/sentry/prisma/playwright/context7는 현재 연결됨
- postgres(read)는 실행 시 `.env`의 `DATABASE_URL`을 먼저 읽고 없으면 즉시 실패 처리함 (`scripts/ops/start-postgres-mcp.cmd` + `start-postgres-mcp.mjs`)
- 로컬 우선 원천 설정은 `opencode.json` 기준이며, 토큰은 환경변수로만 주입한다.
- `DATABASE_URL`이 세션 환경 또는 `.env`에 존재하면 postgres(read)도 동일 플로우에서 연결 검증 가능
- `github`/`sentry`/`context7`는 `.env`/세션 환경값을 읽는 래퍼(`start-github-mcp.cmd`, `start-sentry-mcp.cmd`, `start-context7-mcp.cmd`)로 실행한다.
- 특이사항: 실서비스 탐색 중 치명적 콘솔/네트워크 오류(4xx/5xx)는 미탐지, 접근성 경고 1건 확인
- `실행 환경` 기준: 로그인 페이지 경고는 코드 반영 후에도 운영 페이지에서 동일 경고가 재현되어, 배포 반영/캐시 동기화를 추가 확인 필요

## 3) Edge 9333 실행법
- 기본 실행 커맨드(복붙 실행)
  - `msedge.exe --remote-debugging-port=9333 --user-data-dir="C:\tmp\edge-mcp-profile" --no-first-run --new-window`
- 실행 전 확인
  - 기존 msedge 디버깅 세션이 같은 포트 9333을 점유 중이면 종료 후 재시작
- 실행 후 확인
  - `http://127.0.0.1:9333/json` 접근 가능 여부
- 운영 스크립트
  - `scripts/start-edge-devtools.ps1`

## 4) Regression Smoke v1 (oingapp)
- 대상 URL: `https://www.oingapp.com`
- 실행 항목
  1. 페이지 이동 및 로드 확인
  2. `document.title` 확인
  3. 주요 내비 링크 존재/이동 확인
     - `/`, `/wordbooks/market`, `/pricing`, `/login`
  4. 콘솔 에러/경고 요약
  5. 네트워크 실패(4xx/5xx) 요약
- 결과 표(권장)
  - 항목 | 결과(PASS/FAIL/WARN) | 증거

### 최근 실행 예시(요약)
- 페이지 이동/로드: PASS (`readyState: complete`)
- title: PASS (`오잉앱`)
- 네비 링크: PASS (4개 모두 DOM에서 탐지)
- 콘솔: WARN (`A form field element should have an id or name attribute`) — 로컬 배포 브랜치 반영 전 확인 필요
- 네트워크 실패: PASS (4xx/5xx 없음, 307 1건)
  - 로그인 경고 재점검(운영 재측정): `/login?_smoke=2`에서 연속 재점검 3회 모두 `warn` 유지

## 5) Ops Debug v1 (oingapp)
- 대상 URL: `https://www.oingapp.com`
- 실행 항목
  1. 콘솔 에러 Top N
  2. 네트워크 실패 Top N
  3. 초기 로드 타이밍(가능 시)
  4. 최종 결론 도출
- 결론 분류
  - `정상`: 치명적 에러·연결 실패 없음
  - `주의`: 개선 필요 경고 존재
  - `비정상`: 사용자 플로우 훼손/장애 반복 관측
- 최근 실행 요약
- 콘솔 Top: `A form field element should have an id or name attribute`
- 네트워크 Top: 1회 `/_next/static/chunks/app/login/page-*.js` fetch 502, `/wordbooks`에서 307 리다이렉트 1건
- 초기 로드: `firstByte=249ms`, `domContentLoaded=418ms`, `load=418ms`
- 최종 결론: `주의`
- 주의: 로그인 경고는 코드 레이어에서 입력 id/name 보완이 적용된 상태이나, 실서비스 산출물 반영 전 상태라 재확인 단계 필요
- 최신 재점검 결과 (`npm run ops:prod-login-check`):
  - `/login?_smoke=2`에서 노출되는 번들이 `/_next/static/chunks/app/login/page-7949e7fe4576be4c.js`로 확인됨
  - 해당 번들에서 `name="email"`/`name="password"`는 문자열 상에서 확인되나 `id="login-email"`/`id="login-password"`는 미발견
  - `A form field element should have an id or name attribute` 경고 텍스트는 번들 자체에서 미탐지이나, `id` 누락 이슈로 주의 상태는 유지
  - 2026-02-28 20:56:32~20:56:39 3회 연속 재측정에서 동일 번들(`page-7949e7fe4576be4c.js`) `warn` 유지

## 6) MCP 도입 실행(최소권한)
- 도입 순서는 `github(read)` -> `postgres(read)` -> `sentry(read)` -> `prisma(read)` -> `playwright` -> `context7(필요 시)`로 고정한다.
- 상세 실행표: `docs/mcp-adoption-execution-2026-02-28.md`
- 현재 상태: 1~5단계가 구성/연결까지 반영되었고, `postgres`는 `.env`/세션 주입 확인 후 연결 검증 플로우까지 동작 확인됨.
- 공통 체크: 각 단계는 "요청 승인 -> 구성 반영 -> 연결 확인 -> health check 3개 -> 상태 기록" 순서로 진행한다.

### 도입 진행 상태
- [x] 1) github(read) 도입
- [x] 2) postgres(read) 도입 (구성 반영, env 로드/연결 검증 완료)
- [x] 3) sentry(read) 도입
- [x] 4) prisma(read) 도입
- [x] 5) playwright 도입
- [x] 6) context7 도입

### github(read)
- 목적: 운영 이슈 추적 자동화(이슈/PR/릴리즈 조회)
- 토큰/계정: GitHub Fine-grained PAT(또는 App) - repository read-only 권한만 허용
- 최소 권한: `contents:read`, `issues:read`, `pulls:read`, `metadata:read` 수준
- 도입 우선순위: 1순위
- 도입 조건
  - 승인: github 팀 토큰 발급 승인
  - 구성: 최소권한 PAT/App Secret 등록 및 연결 테스트
- 상태: `대기`
- 금지 항목: org-admin, 쓰기/워크플로 실행, 배포 트리거
- Health check 3개
  1. 연결 토큰 유효성 + rate limit 조회
  2. 최근 7일 PR/Issue 목록 조회
  3. 릴리즈/태그 최근 상태 조회
- 1주 후 권한 승격 기준: 자동 티켓화/라벨링 빈도 높아 `issues:write`가 정말 필요한 경우에만 승인

### postgres(read)
- 목적: 운영 상태를 비파괴적으로 확인(집계/지연/트렌드)
- 토큰/계정: 운영용 read-only DB 계정 (별도 조회 전용 사용자)
- 최소 권한: read-only DB 계정, `SELECT`만 허용
- 도입 우선순위: 2순위
- 도입 조건
  - 승인: 운영 read-only 계정 권한 검토 및 발급
  - 구성: 쿼리 전용 연결 정보 등록
  - 선행: github(read) 1단계 통과
- 상태: `대기`
- 금지 항목: DDL, INSERT/UPDATE/DELETE, 민감 컬럼 대량 추출
- Health check 3개
  1. `SELECT 1` 성공
  2. 최근 30분 슬로우 쿼리 상위 5개 조회
  3. 연결 풀 사용량/대기 커넥션 조회
- 1주 후 권한 승격 기준: 장애 대응을 위한 임시 조회 범위 확장 필요 시에만 제한 승인

### sentry(read)
- 목적: 실서비스 에러군집 추적 및 릴리즈 영향도 확인
- 토큰/계정: Sentry read 토큰 또는 API 토큰(Organization read 권한 비활성, issue/event 조회만 허용)
- 최소 권한: read-only(이슈/이벤트 조회), 프로젝트/환경 조회 가능
- 도입 우선순위: 3순위
- 도입 조건
  - 승인: Sentry API 토큰(최소권한) 발급 승인
  - 구성: read 토큰 적용 및 테스트 이벤트 조회 가능
  - 선행: github(read), postgres(read) 통과
- 상태: `대기`
- 금지 항목: 프로젝트 설정 변경, 조직/멤버/알림 채널 설정 변경
- Health check 3개
  1. 최근 24시간 이벤트 정상 조회
  2. 심각도 상위 issue Top 조회
  3. release 필터 및 환경 필터 동작 점검
- 1주 후 권한 승격 기준: 반복 장애 시 자동 티켓 등록 자동화가 필수인 경우에만 제한 write 허용

### prisma(read)
- 목적: 스키마/마이그레이션 drift 점검
- 토큰/계정: Prisma Cloud/DB 툴 계정 연동 전용 read-only 마이그레이션 뷰어
- 최소 권한: schema/migration read-only
- 도입 우선순위: 4순위
- 도입 조건
  - 승인: 스키마/마이그레이션 조회용 계정/토큰 승인
  - 구성: 민감정보 최소화된 조회 전용 연결 설정
  - 선행: github(read), postgres(read), sentry(read) 통과
- 상태: `대기`
- 금지 항목: 운영 마이그레이션 실행, deploy/apply, 데이터 변경
- Health check 3개
  1. 현재 스키마 메타 조회
  2. migration history 조회
  3. 상태값 drift 여부 점검
- 1주 후 권한 승격 기준: 운영 배포 의사결정 회의에서 명시 승인 시 development 수준 최소 확장

### playwright
- 목적: 회귀/연결성 자동 점검의 신뢰성 강화
- 토큰/계정: GitHub OIDC/JWT 연동 런타임 계정 또는 로컬 실행 사용자, 추가 시크릿 없음
- 최소 권한: 테스트 전용 브라우저 실행권한 및 테스트 URL 읽기
- 도입 우선순위: 5순위
- 도입 조건
  - 승인: CI/테스트 실행 정책 동의
  - 구성: 테스트 실행 권한 및 브라우저/URL 화이트리스트 반영
  - 선행: github(read), postgres(read), sentry(read), prisma(read) 통과
- 상태: `대기`
- 금지 항목: 실거래 API 직접 호출, 결제·관리자 권한 자동화
- Health check 3개
  1. 로그인 제외 라우팅 smoke 통과율
  2. 콘솔 경고/에러 수집 파이프라인 동작
  3. 스크린샷 비교 또는 DOM 안정성 지표 확보
- 1주 후 권한 승격 기준: 비로그인 테스트에서 실제 사용자 플로우 확장 필요 시 승인

### context7(필요 시)
- 목적: 라이브러리/도메인 공식 레퍼런스 즉시 조회
- 토큰/계정: context7 API 토큰(read-only), 만료 정책 명시된 공유 계정
- 최소 권한: read-only 문서 조회 토큰
- 도입 우선순위: 6순위
- 도입 조건
  - 필요성 검증: 팀 도큐먼트 조회 빈도 및 정책상 필요성 확인
  - 승인: 토큰 발급/기간/보존 정책 승인
  - 선행: playwright 5순위 통과 또는 필요성 동시 승인
- 상태: `대기`
- 금지 항목: 코드 변경, 설정 변경, 비인가 데이터 캐시 보관
- Health check 3개
  1. 라이브러리 검색 응답 정상
  2. API 버전/예시 조회
  3. 조회 로그 민감정보 마스킹 확인
- 1주 후 권한 승격 기준: 문서 활용 빈도가 낮으면 비활성화, 높을 경우 기간 기반 토큰 갱신으로 재발급

## 7) 운영 반영 승인 요청 체크리스트
- 목적: 코드 반영 후 실서비스 노출/캐시 동기화가 완료되었는지 운영 승인 이전에 선제 검증
- 제출 항목(요약):
  - 최근 운영 노출 기준 번들: `/_next/static/chunks/app/login/page-7949e7fe4576be4c.js` (변경 시 즉시 갱신)
  - 의도된 DOM 변경: `/login` 비밀번호 로그인 폼의 `input#login-email`, `input#login-password`, `name` 속성 추가
- 운영 요청 포맷(필수 포함):
  - `oingapp` 배포 브랜치 또는 패키지 배포 버전
  - 캐시/CDN 경로 purge 대상: `/_next/static/chunks/app/login/page-*.js`, `/login` HTML 뷰 템플릿
  - 배포 완료 후 확인 URL: `https://www.oingapp.com/login?_smoke=2`
- 완료 판정 조건(운영):
  - HTML `<script src="/_next/static/chunks/app/login/page-*.js">`에서 새 해시가 노출
  - `https://www.oingapp.com/login?_smoke=2` 콘솔 경고 `A form field element should have an id or name attribute` 미노출
  - 페이지 소스 내 `login-email`/`name="email"`, `login-password`/`name="password"` 확인

## 8) 체크리스트
- 연결 전
  - [ ] MCP owner 지정
  - [ ] chrome-devtools 연결 주소 공유(9333)
  - [ ] 토큰 보관소/접근자 범위 고지
- 연결 직후
  - [ ] target tab 고정
  - [ ] Smoke v1 항목 5개 실행
  - [ ] 콘솔/네트워크 민감정보 노출 여부 점검
- 1주 후
  - [ ] 사용 빈도, false positive 비율 검토
  - [ ] 미활성 MCP 비활성화
  - [ ] 최소권한 재점검 및 정리

## 9) 보안 가드레일
- 야간 자동화는 리포트 중심 실행
- 배포/시크릿/파괴성 작업 금지
- main 직접 수정/커밋/푸시 금지(브랜치 기반 절차 준수)
- 민감정보(쿠키/토큰/개인정보)는 로그·콘솔·스크린샷에 출력하지 않는다
- 권한은 승인되지 않은 경우 최소권한 상향 금지
