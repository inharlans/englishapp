# Pilot 005 Review - HTTP Smoke Auth Failure Coverage

Date: 2026-02-22

## Summary
- `http-smoke.mjs` now validates both happy-path and failure-path auth behavior.
- Coverage now includes unauthenticated, CSRF-blocked, and CSRF-approved requests.

## Implemented Checks
- Before login:
  - `GET /api/auth/me` returns `200` and `user: null`
  - `GET /api/admin/reports` returns `401`
- After login:
  - session + csrf cookies parsed from `set-cookie`
  - `POST /api/auth/logout` without CSRF -> `403`
  - `POST /api/auth/logout` with CSRF + origin/referer -> `200`

## Validation
- `node --check tests/e2e/http-smoke.mjs` passed.
- targeted auth route unit tests passed.
- `npm run hooks:validate` passed.

## Operational Result
- Smoke E2E now better reflects the auth-route-debugger/tester operational model by asserting expected auth failure semantics, not only success flow.
