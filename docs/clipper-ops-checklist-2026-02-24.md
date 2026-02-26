# Clipper v1.1 Ops Checklist (2026-02-24)

## Env vars
- [x] `GEMINI_API_KEY` set in runtime
- [x] `CLIPPER_LLM_PROVIDER=gemini`
- [x] `CLIPPER_LLM_MODEL=gemini-2.5-flash-lite`
- [x] `CRON_SECRET` set
- [ ] `GOOGLE_TRANSLATE_API_KEY` optional fallback only
- [ ] `INTERNAL_CRON_ALLOWED_IPS` optional hardening (`ip1,ip2,...`)
- [ ] `E2E_SECRET` required for internal E2E login route
- [ ] `INTERNAL_E2E_ALLOWED_IPS` optional hardening (`ip1,ip2,...`)

## DB migration status
- [x] Prisma migration status is up-to-date (`npx prisma migrate status`)
- [x] `WordbookItem` enrichment columns exist in DB
- [x] enum `EnrichmentStatus` exists (`QUEUED|PROCESSING|DONE|FAILED`)
- [x] unique index `(wordbookId, normalizedTerm)` exists

## Cron route status
- [x] `/api/internal/cron/clipper-enrichment` implemented
- [x] `CRON_SECRET` bearer auth enforced
- [x] optional source IP allowlist enforced via `INTERNAL_CRON_ALLOWED_IPS`
- [x] same internal security applied to other internal cron routes

## Clipper flow smoke
- [x] Added E2E script: `tests/e2e/clipper-flow.mjs`
- [x] Added npm command: `npm run test:e2e:clipper`
- [x] Added internal E2E login route: `POST /api/internal/e2e/login`
- [x] Scenario covers:
  - internal E2E login (session + csrf cookie issue)
  - create wordbook
  - set default clipper wordbook
  - call `/api/clipper/add` and verify `created/duplicate`
  - verify `created` item starts as `enrichmentStatus=QUEUED`
  - trigger internal clipper cron when `CRON_SECRET` exists
- [ ] Live E2E run with valid runtime credentials
  - Current local run was blocked by auth state (`/api/auth/login` 401, local debug login disabled under `next start` production mode)

## Security hardening
- [x] Internal cron auth moved to shared helper: `lib/internalCronSecurity.ts`
- [x] Allowlist behavior:
  - if `INTERNAL_CRON_ALLOWED_IPS` empty: secret-only auth
  - if set: secret + source IP exact match required
- [x] Internal E2E auth route guard:
  - `NODE_ENV=production` -> 404
  - `x-e2e-secret` must match `E2E_SECRET`
  - optional `INTERNAL_E2E_ALLOWED_IPS` exact match

## Notes
- `GOOGLE_TRANSLATE_API_KEY` is not required for normal Gemini path.
- It is used only when Gemini batch call fails and fallback translation is attempted.

## Auth policy checks
- [x] Production policy: password login restricted for non-admin users
- [x] Disabled password login response: `403` + `code=PASSWORD_LOGIN_DISABLED`
- [x] Disabled attempts are logged (`password_login_disabled_attempt`)
- [x] Rate limit still applies before policy check (`authLogin:{ip}`)
