# Post-Deploy Runbook

Date: 2026-02-22

## 1) Basic Availability
1. Open `/login` and verify page load.
2. Open `/wordbooks/market` and verify list render.

## 2) Auth Boundary
1. Logged-out request:
   - `GET /api/admin/reports` -> expect `401`.
2. Logged-in request:
   - `GET /api/auth/me` -> expect non-null `user`.

## 3) Core API Smoke
1. `GET /api/wordbooks/market?sort=top&page=0&take=5`
2. `GET /api/words?mode=memorize&batch=1&page=0&week=1`
3. Confirm status `200` and valid JSON shape.

## 4) Payments and Cron Boundary
1. Check `/api/payments/*` routes return expected auth/validation responses.
2. For internal cron routes, call with secret in controlled environment:
   - `/api/internal/cron/plan-expire`
   - `/api/internal/cron/wordbook-rank`

## 5) Ops Gate
1. Run `npm run ops:readiness` once on deployed environment.
2. Verify:
   - `.loop/last-ops-readiness.json` has `"status": "pass"`.
3. Keep generated report under:
   - `docs/ai-operating-system-2026-02-22/reports/ops-readiness-<timestamp>.md`

## 6) Rollback Trigger
Rollback immediately if any of these occur:
1. `/login` or `/wordbooks/market` fails to render.
2. Auth boundary regression (`/api/admin/reports` not `401` when logged out).
3. `ops:readiness` fails.

## 7) Codex Validation Flow
1. Ensure Codex policy rules exist:
   - `.codex/rules/default.rules`
2. Ensure local pre-commit gate is installed:
   - `npm run codex:hooks:install`
   - `git config --get core.hooksPath` must be `.githooks`
3. Manual guard check:
   - `npm run codex:workflow:check`
4. Run local verification:
   - `npm run verify`
5. Confirm CI gate uses verify flow:
   - `.github/workflows/ci.yml` includes `npm run verify:ci`
6. Evidence capture:
   - Primary: CI required check success
   - Secondary: PR checklist includes verify confirmation
7. If verify fails:
   - Fix lint/typecheck/test failure first
   - Re-run `npm run verify`
   - Re-deploy only after verify + ops readiness pass

## 8) Failure Playbook
1. `typecheck` failure:
   - Run `npm run typecheck` and capture first error location.
   - Fix type mismatch/import/config issue.
   - Re-run `npm run verify`.
2. `lint` failure:
   - Run `npm run lint` and resolve reported rule violations.
   - Re-run `npm run verify`.
3. `test` failure:
   - Run `npm test` and identify first failing test.
   - Fix regression or update test only when behavior change is intentional.
   - Re-run `npm run verify`.
4. Rollback/hotfix decision:
   - If verify or readiness cannot be restored quickly, rollback to last green deploy.
   - If fix is small and low-risk, prepare hotfix and require verify pass before deploy.
