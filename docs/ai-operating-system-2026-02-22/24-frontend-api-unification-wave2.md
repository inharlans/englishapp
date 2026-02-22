# Frontend API Unification Wave 2 (E-02 Part 2)

Date: 2026-02-22

## Added API Modules
- `lib/api/wordbook.ts`
- `lib/api/quiz.ts`
- `lib/api/study.ts`

## Refactored Call Sites
- `components/wordbooks/WordbookMetaEditor.tsx`
  - wordbook meta patch call -> `updateWordbookMeta`
- `components/wordbooks/WordbookItemRow.tsx`
  - item patch/delete calls -> `updateWordbookItem`, `deleteWordbookItem`
- `components/wordbooks/WordbookListClient.tsx`
  - study list fetch call -> `fetchWordbookStudy`
- `app/wordbooks/[id]/quiz/quizClient.tsx`
  - quiz load/submit calls -> `fetchWordbookQuizQuestion`, `submitWordbookQuizAnswer`
- `app/wordbooks/[id]/study/studyClient.tsx`
  - memorize fetch call -> `fetchWordbookStudy`

## Validation
- `npm run typecheck` pass
- `npm run lint` pass
- `npm run mcp:cycle` pass

## Remaining E-02 Scope
- Large creation/import flow in `app/wordbooks/new/page.tsx` still uses inline `apiFetch`.
- Additional wordbook components with simple inline API calls are pending normalization.
