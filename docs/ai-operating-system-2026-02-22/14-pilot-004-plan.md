# Pilot 004 Plan - Auth Endpoint Scenario Coverage

Date: 2026-02-22

## Objective
- Expand operational validation from hook-only checks to route-level auth scenarios.

## Scope
- `C:\dev\englishapp\app\api\admin\reports\route.test.ts`
- `C:\dev\englishapp\app\api\auth\me\route.test.ts`
- `C:\dev\englishapp\app\api\auth\logout\route.test.ts`
- `C:\dev\englishapp\scripts\validate-hook-chains.js`

## Scenarios
- `401` when auth context is missing.
- `403` when non-admin calls admin route.
- cookie-missing path for `/api/auth/me` returns `{ user: null }`.
- CSRF failure path on `/api/auth/logout` is blocked.
- CSRF-valid logout clears session/csrf cookies.
- Korean auth keywords also route to `auth-route-debugger` and `auth-route-tester`.

## Acceptance
- New tests pass in Vitest.
- `npm run hooks:validate` passes with Korean routing assertions included.
