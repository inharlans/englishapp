# API 구조 리팩터링 체크리스트 (2026-02-27)

## Phase 1
- [x] 공통 헬퍼 파일 생성 (`lib/api/route-helpers.ts`)
- [x] 1차 라우트 적용
  - [x] `app/api/wordbooks/[id]/report/route.ts`
  - [x] `app/api/wordbooks/[id]/rate/route.ts`
  - [x] `app/api/wordbooks/[id]/items/route.ts`
  - [x] `app/api/wordbooks/[id]/items/[itemId]/route.ts`
- [x] 2차 라우트 적용
  - [x] `app/api/wordbooks/[id]/download/route.ts`
  - [x] `app/api/wordbooks/[id]/publish/route.ts`
  - [x] `app/api/wordbooks/[id]/sync-download/route.ts`
  - [x] `app/api/wordbooks/[id]/study/items/[itemId]/route.ts`
  - [x] `app/api/admin/users/[id]/plan/route.ts`
  - [x] `app/api/admin/reports/[id]/route.ts`
- [x] 검증 실행
  - [x] `npm run codex:workflow:check`
- [x] README 변경 이력 반영

## Phase 2
- [x] 단어장 가드 헬퍼 파일 생성 (`lib/api/wordbook-guards.ts`)
- [x] 소유권/요금제 가드 공통화 적용
  - [x] `app/api/wordbooks/[id]/items/route.ts`
  - [x] `app/api/wordbooks/[id]/items/[itemId]/route.ts`
  - [x] `app/api/wordbooks/[id]/import/route.ts`
  - [x] `app/api/wordbooks/[id]/publish/route.ts`
- [x] 파라미터/인증 헬퍼 확장
  - [x] `app/api/wordbooks/[id]/export/route.ts`
- [x] 검증 실행
  - [x] `npm run codex:workflow:check`

## Phase 3
- [x] 잔여 `parseId` 제거
  - [x] `app/api/wordbooks/[id]/block/route.ts`
  - [x] `app/api/wordbooks/[id]/quiz/route.ts`
  - [x] `app/api/wordbooks/[id]/quiz/submit/route.ts`
  - [x] `app/api/wordbooks/[id]/reviews/route.ts`
  - [x] `app/api/wordbooks/[id]/route.ts`
  - [x] `app/api/wordbooks/[id]/study/route.ts`
  - [x] `app/api/words/[id]/route.ts`
- [x] 인증 반복 로직 통일(`requireUserFromRequest`)
  - [x] `app/api/wordbooks/[id]/block/route.ts`
  - [x] `app/api/wordbooks/[id]/quiz/route.ts`
  - [x] `app/api/wordbooks/[id]/quiz/submit/route.ts`
  - [x] `app/api/wordbooks/[id]/route.ts`
  - [x] `app/api/wordbooks/[id]/study/route.ts`
- [x] 검증 실행
  - [x] `npm run codex:workflow:check`

## Phase 4
- [x] 쿼리 빌더 분리 파일 추가 (`lib/api/wordbook-study-query.ts`)
- [x] 대형 라우트에서 빌더 로직 이관
  - [x] `app/api/wordbooks/[id]/study/route.ts`
- [x] 검증 실행
  - [x] `npm run codex:workflow:check`

## Phase 5
- [x] 학습 조회 서비스 추가 (`server/domain/wordbook/study-service.ts`)
- [x] `/api/wordbooks/[id]/study` 라우트에서 DB/캐시 처리 제거
- [x] 검증 실행
  - [x] `npm run codex:workflow:check`
