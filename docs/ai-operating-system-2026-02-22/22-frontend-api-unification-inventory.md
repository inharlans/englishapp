# Frontend API Unification Inventory (E-01)

Date: 2026-02-22

## Scope
- Scan target: `app/**`, `components/**`, `lib/**` (excluding tests)
- Goal: find client-side direct network calls that bypass shared API access layer

## Findings
- Direct client-side `fetch(...)` usage: none found in frontend UI code.
- Shared wrapper usage: `lib/clientApi.ts` -> `apiFetch(...)` is already used broadly.
- Server-side/external fetch (not E-01 대상):
  - `app/api/translate/route.ts`
  - `app/api/auth/{google,naver,kakao}/callback/route.ts`

## Current Frontend Access Pattern
- Standard access path:
  - UI component/page -> `apiFetch` from `lib/clientApi.ts` -> `/api/*`
- Security note:
  - `apiFetch` injects CSRF header from cookie automatically.

## Hotspots For E-02 Migration (High-traffic candidates)
- Admin:
  - `app/admin/usersClient.tsx`
  - `components/admin/UserPlanEditor.tsx`
- Payments:
  - `components/payments/PricingActions.tsx`
- Study/Quiz:
  - `app/wordbooks/[id]/quiz/quizClient.tsx`
  - `app/wordbooks/[id]/study/studyClient.tsx`
  - `components/wordbooks/WordbookListClient.tsx`
- Wordbook write flows:
  - `app/wordbooks/new/page.tsx`
  - `components/wordbooks/WordbookMetaEditor.tsx`
  - `components/wordbooks/WordbookItemRow.tsx`

## E-02 Entry Rule
- Keep transport in `apiFetch`.
- Add feature-level typed API modules (e.g. `lib/api/admin.ts`, `lib/api/wordbook.ts`, `lib/api/quiz.ts`).
- Replace inline endpoint strings in components with typed module functions.
