# Folder Structure Refactor Checklist (Session Handoff Ready)

Date: 2026-02-22

## CURRENT_FOCUS
- Active Phase: `Phase E complete (Frontend API unification + error standardization + smoke e2e)`
- Next Task: `Phase F planning (optional)`
- Owner: `Codex + User`
- Last Verified Gate: `mcp:cycle pass + test:e2e:local:smoke pass (2026-02-22)`

## A. Auth Domain
- [x] A-01 `server/domain/auth/contracts.ts` 생성
- [x] A-02 `server/domain/auth/repository.ts` 생성
- [x] A-03 `server/domain/auth/service.ts` 생성
- [x] A-04 `server/domain/auth/mapper.ts` 생성
- [x] A-05 `app/api/auth/login/route.ts` -> service 호출 전환
- [x] A-06 `app/api/auth/logout/route.ts` -> service 호출 전환
- [x] A-07 `app/api/auth/me/route.ts` -> service 호출 전환
- [x] A-08 `app/api/auth/bootstrap/route.ts` -> service 호출 전환
- [x] A-09 auth 관련 테스트 통과

## B. Wordbook Domain
- [x] B-01 `server/domain/wordbook/contracts.ts` 생성
- [x] B-02 `server/domain/wordbook/repository.ts` 생성
- [x] B-03 `server/domain/wordbook/service.ts` 생성
- [x] B-04 `/api/wordbooks` 1차 전환
- [x] B-05 `/api/wordbooks/[id]` 1차 전환
- [x] B-06 마켓/리뷰/신고/차단 하위 모듈 분리

## C. Quiz/Study Domain
- [x] C-01 `server/domain/quiz/contracts.ts` 생성
- [x] C-02 `server/domain/quiz/repository.ts` 생성
- [x] C-03 `server/domain/quiz/service.ts` 생성
- [x] C-04 `/api/wordbooks/[id]/quiz*` 전환
- [x] C-05 `/api/quiz/submit` 전환
- [x] C-06 테스트 보강 및 통과

## D. Payments/Admin/Internal Domain
- [x] D-01 `server/domain/payments/*` 생성
- [x] D-02 `/api/payments/*` 전환
- [x] D-03 `server/domain/admin/*` 생성
- [x] D-04 `/api/admin/*` 전환
- [x] D-05 `server/domain/internal/*` 생성
- [x] D-06 `/api/internal/cron/*` 전환

## E. Frontend API Unification
- [x] E-01 direct 호출 인벤토리 작성 (`22-frontend-api-unification-inventory.md`)
- [x] E-02 공통 API 클라이언트 경유 전환 (wave1~wave3)
- [x] E-03 공통 에러 처리 표준화 (`lib/api/base.ts`, `ApiError`, `parseApiResponse`)
- [x] E-04 UI smoke e2e 검증 (`npm run test:e2e:local:smoke`)

## Common Gates
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run mcp:cycle`
- [x] `npm run test:e2e:local:smoke`

## Session Log
### 2026-02-22 (Update 10)
- `25-frontend-api-unification-wave3.md` 작성 완료
- E-02 잔여 14개 호출을 `lib/api/*` 모듈 호출로 전환 완료
- 상태: `app/*`, `components/*` 내 direct `apiFetch(...)` 잔여 0건
- 검증: `typecheck`, `lint`, `mcp:cycle` pass

### 2026-02-22 (Update 11)
- `26-frontend-api-error-standardization-e3.md` 작성 완료
- `lib/api/base.ts` 추가 (`ApiError`, `parseApiResponse`)
- `27-ui-e2e-smoke-e4.md` 작성 완료
- 검증: `typecheck`, `lint`, `mcp:cycle`, `test:e2e:local:smoke` pass

## Ready State
- Phase A~E 완료
- Phase F kickoff 완료 (`ops:readiness` 자동화 추가 및 pass 확인)
- 다음 세션은 `Phase F-2 (CI 연동/관측 대시보드 고정)` 또는 `릴리즈 준비`로 시작 가능

### 2026-02-22 (Update 12)
- `28-phase-f-operations-automation.md` 작성 완료
- `scripts/ops/ops-readiness.js` 추가
- `package.json`에 `ops:readiness` 스크립트 추가
- 실행 검증:
  - `npm run ops:readiness` pass
  - 산출물 생성 확인:
    - `.loop/last-ops-readiness.json`
    - `docs/ai-operating-system-2026-02-22/reports/ops-readiness-20260222-202117.md`
