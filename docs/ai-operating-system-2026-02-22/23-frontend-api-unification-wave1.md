# Frontend API Unification Wave 1 (E-02 Part 1)

Date: 2026-02-22

## Added API Modules
- `lib/api/admin.ts`
- `lib/api/payments.ts`
- `lib/api/auth.ts`

## Refactored Call Sites
- `app/admin/usersClient.tsx`
  - inlined admin `apiFetch` calls -> `getAdminUsers`, `getAdminReports`, `getAdminMetrics`, `recomputeAdminWordbookRank`, `moderateAdminReport`
- `components/admin/UserPlanEditor.tsx`
  - inlined plan update call -> `updateAdminUserPlan`
- `components/payments/PricingActions.tsx`
  - inlined payments calls -> `createCheckout`, `confirmPayment`, `getPortalUrl`
- `components/auth/LoginPanel.tsx`
  - inlined login call -> `loginWithEmail`

## Validation
- `npm run typecheck` pass
- `npm run lint` pass
- `npm run test -- app/api/admin/reports/route.test.ts app/api/payments/checkout/route.test.ts app/api/payments/confirm/route.test.ts app/api/payments/portal/route.test.ts` pass
- `npm run mcp:cycle` pass

## Remaining E-02 Scope (Wave 2)
- Wordbook and quiz/study components still call `apiFetch` with inlined route strings.
- Next extraction targets:
  - `lib/api/wordbook.ts`
  - `lib/api/quiz.ts`
  - `lib/api/study.ts`
