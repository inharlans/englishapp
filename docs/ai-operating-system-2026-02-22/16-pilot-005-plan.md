# Pilot 005 Plan - HTTP Smoke Auth Failure Coverage

Date: 2026-02-22

## Objective
- Expand smoke E2E to cover auth failure and CSRF failure/success path in one run.

## Scope
- `C:\dev\englishapp\tests\e2e\http-smoke.mjs`

## Changes
- Add unauthenticated checks:
  - `/api/auth/me` -> `200` with `user: null`
  - `/api/admin/reports` -> `401`
- Strengthen login cookie handling:
  - parse both session and csrf cookies
- Add logout mutation checks:
  - missing CSRF header -> `403`
  - valid CSRF + same-origin headers -> `200`

## Acceptance
- Script remains syntax-valid and executable.
- Existing route-unit and hook validations remain green after change.
