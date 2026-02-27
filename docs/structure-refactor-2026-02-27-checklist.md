# API 구조 리팩터링 체크리스트 (2026-02-27)

## Phase 1
- [x] 공통 헬퍼 파일 생성 (`lib/api/route-helpers.ts`)
- [x] 1차 라우트 적용
  - [x] `app/api/wordbooks/[id]/report/route.ts`
  - [x] `app/api/wordbooks/[id]/rate/route.ts`
  - [x] `app/api/wordbooks/[id]/items/route.ts`
  - [x] `app/api/wordbooks/[id]/items/[itemId]/route.ts`
- [ ] 2차 라우트 적용
  - [x] `app/api/wordbooks/[id]/download/route.ts`
  - [x] `app/api/wordbooks/[id]/publish/route.ts`
  - [x] `app/api/wordbooks/[id]/sync-download/route.ts`
  - [x] `app/api/wordbooks/[id]/study/items/[itemId]/route.ts`
  - [x] `app/api/admin/users/[id]/plan/route.ts`
  - [x] `app/api/admin/reports/[id]/route.ts`
- [ ] 검증 실행
  - [x] `npm run codex:workflow:check`
- [x] README 변경 이력 반영
