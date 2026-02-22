# Englishapp 서버 전체 리팩터링 마스터 플랜/체크리스트 (AHW 기준)

Date: 2026-02-22  
Reference: `https://github.com/chacha95/advanced-harness-window` (`backend/`, `frontend/`)

## 1. 전제
- 목표는 "동작 유지 + 구조 개선"이다.
- API 계약 파괴적 변경은 원칙적으로 금지한다.
- 모든 단계는 `mcp:cycle` 통과를 게이트로 사용한다.

## 2. 리팩터링 범위
- API 라우트: `app/api/**/route.ts` (현재 55개)
- 공통 라이브러리: `lib/**`
- 프론트 API 호출 계층: `lib/clientApi.ts` + 컴포넌트 내 fetch 사용부
- 테스트: `app/api/**/*.test.ts`, `tests/e2e/*.mjs`

## 3. 단계별 계획

### Phase 0. 기준선 고정 (2~3일)
- 작업:
  - 모든 핵심 API 경로의 현재 계약 스냅샷 생성
  - 권한 경계(401/403), CSRF, 결제 흐름 테스트 확정
  - 공통 에러/응답 형식 정의
- 산출물:
  - `docs/contracts-baseline/*.md` (또는 json)
  - 도메인별 위험 목록
- 완료 기준:
  - 회귀 테스트 세트 확보
  - 라우트별 현재 계약을 문서로 확인 가능

체크리스트:
- [ ] 인증 라우트 계약 정리 (`/api/auth/*`)
- [ ] 단어장 라우트 계약 정리 (`/api/wordbooks*`)
- [ ] 퀴즈 라우트 계약 정리 (`/api/wordbooks/[id]/quiz*`, `/api/quiz/submit`)
- [ ] 결제 라우트 계약 정리 (`/api/payments/*`)
- [ ] 관리자 라우트 계약 정리 (`/api/admin/*`)
- [ ] 내부 크론 라우트 계약 정리 (`/api/internal/cron/*`)

### Phase 1. 코어 계층 도입 (2~4일)
- 작업:
  - `server/core/config.ts`, `server/core/errors.ts` 도입
  - `server/infra/prisma.ts`, `server/infra/auth.ts` 도입
  - 기존 `lib/prisma.ts`, `lib/authServer.ts`와 브리지 생성
- 산출물:
  - target 구조의 최소 골격
- 완료 기준:
  - 신규 도메인은 `server/*`에서만 구현 가능

체크리스트:
- [ ] `server/core` 기본 모듈 생성
- [ ] `server/infra` adapter 생성
- [ ] 기존 `lib/*`와 호환 adapter 작성
- [ ] lint/typecheck/test 통과

### Phase 2. Auth 도메인 선행 전환 (3~5일)
- 작업:
  - `auth`를 샘플 도메인으로 `contracts/repository/service` 분리
  - 대상 라우트:
    - `POST /api/auth/login`
    - `POST /api/auth/logout`
    - `GET /api/auth/me`
    - `POST /api/auth/bootstrap`
- 이유:
  - 보안/권한/세션 경계가 명확해 패턴 정착에 적합
- 완료 기준:
  - 라우트는 서비스 호출만 하고 Prisma 직접 접근 없음
  - 401/403/CSRF 테스트 통과

체크리스트:
- [ ] `server/contracts/auth.ts`
- [ ] `server/domain/auth/repository.ts`
- [ ] `server/domain/auth/service.ts`
- [ ] `app/api/auth/*` 라우트 얇게 정리
- [ ] auth route 테스트 녹색
- [ ] `npm run hooks:validate` 통과

### Phase 3. Wordbook 도메인 전환 (대형, 1~2주)
- 작업:
  - 단어장 CRUD/아이템/퍼블리시/다운로드/마켓/리뷰/신고/차단을 유스케이스 단위 분할
  - 라우트별 서비스 모듈 분리:
    - `wordbookQueryService`
    - `wordbookCommandService`
    - `wordbookMarketService`
    - `wordbookModerationService`
- 완료 기준:
  - 단어장 관련 Prisma 접근은 repository 집합으로 집중
  - 성능 영향 경로는 before/after 측정값 기록

체크리스트:
- [ ] `server/contracts/wordbook.ts`
- [ ] `server/domain/wordbook/model.ts`
- [ ] `server/domain/wordbook/repository.ts`
- [ ] `server/domain/wordbook/service.ts`
- [ ] 마켓/리뷰/신고/차단 분리
- [ ] e2e smoke/시장 동선 테스트 통과

### Phase 4. Quiz/Study 도메인 전환 (4~7일)
- 작업:
  - 퀴즈 출제/제출/오답큐/학습상태 업데이트를 서비스 계층으로 이동
  - 모드별 규칙(meaning/word) 서비스 분리
- 완료 기준:
  - 채점 규칙이 라우트에서 제거됨
  - 오답 재출제/진행률 회귀 테스트 통과

체크리스트:
- [ ] `server/contracts/quiz.ts`
- [ ] `server/domain/quiz/repository.ts`
- [ ] `server/domain/quiz/service.ts`
- [ ] `/api/wordbooks/[id]/quiz*` 경량화
- [ ] `/api/quiz/submit` 정리

### Phase 5. Payments/Admin/Internal 도메인 전환 (1주)
- 작업:
  - 결제/관리자/크론 라우트 계층 분리
  - 외부 SDK 연동(PortOne)은 infra adapter로 캡슐화
- 완료 기준:
  - 결제 실패/재시도/권한 경계 회귀 통과
  - 관리자 API 계약 문서화 완료

체크리스트:
- [ ] `server/contracts/payments.ts`
- [ ] `server/domain/payments/*`
- [ ] `server/domain/admin/*`
- [ ] `server/domain/internal/*`
- [ ] `/api/payments/*`, `/api/admin/*`, `/api/internal/cron/*` 전환

### Phase 6. 프론트 API 계층 표준화 (3~5일)
- 작업:
  - 기준 레포 `frontend/src/lib/api.ts` 패턴처럼 englishapp도 클라이언트 API를 단일화
  - 컴포넌트 직fetch 제거, API 모듈 호출로 변경
- 완료 기준:
  - fetch 에러 처리/인증 갱신/재시도 정책이 한 곳에 모임

체크리스트:
- [ ] `lib/clientApi.ts` 역할 확장 또는 `app-client/api.ts` 분리
- [ ] 주요 페이지 direct fetch 제거
- [ ] API 에러 표준 타입 적용
- [ ] UI 회귀(e2e ui-flow) 통과

### Phase 7. 청소/강제 규칙 (2~3일)
- 작업:
  - 레거시 헬퍼 정리
  - lint rule로 금지 패턴 차단
- 완료 기준:
  - 신규 코드가 구 구조로 유입되지 않음

체크리스트:
- [ ] 라우트 내 Prisma 직접 접근 금지 룰
- [ ] 라우트 내 대형 로직 블록 금지 룰
- [ ] 문서/체크리스트 최신화

## 4. 작업 우선순위
1. Auth
2. Wordbook
3. Quiz/Study
4. Payments
5. Admin/Internal
6. Frontend API 일원화

## 5. 위험요소와 완화
- 위험: 대규모 이동 중 회귀 증가  
  - 완화: 도메인별 분할 PR + 계약 스냅샷 테스트
- 위험: 구조 전환 중 생산성 저하  
  - 완화: 템플릿/코드젠 규칙 제공
- 위험: 성능 저하  
  - 완화: 고비용 경로 벤치마크(전/후) 필수

## 6. PR 운영 규칙
- PR 단위:
  - 최대 1도메인 + 1횡단관심사
- PR 본문 필수 항목:
  - 변경 라우트 목록
  - 계약 변경 여부
  - 회귀 테스트 결과
  - 리스크/롤백 전략
- 승인 조건:
  - `typecheck/lint/test/mcp:cycle` 녹색
  - 도메인 체크리스트 100% 완료

## 7. 도메인별 실행 체크리스트 템플릿
- [ ] 도메인 계약(`contracts/<domain>.ts`) 정의
- [ ] repository 분리(Prisma 직접 접근 캡슐화)
- [ ] service 분리(비즈니스 규칙 이동)
- [ ] route 경량화(파싱/권한/응답 변환만)
- [ ] 단위 테스트 추가(service/repository)
- [ ] 라우트 계약 테스트 추가(상태코드/페이로드)
- [ ] e2e 핵심 동선 테스트 통과
- [ ] 관측성(메트릭/에러 캡처) 확인
- [ ] 문서 갱신(운영표준/변경 로그)

## 8. 바로 실행할 첫 스프린트 제안 (Sprint A)
- 범위:
  - `auth` 도메인 100% 전환
  - `wordbook` 조회 API 2~3개 파일럿 전환
- 목표:
  - 구조 템플릿 확정
  - PR 리뷰 기준선 확정
- 산출물:
  - `server/domain/auth/*`
  - `server/contracts/auth.ts`
  - `auth` 라우트 경량화 완료
  - 리팩터링 패턴 가이드 1건
