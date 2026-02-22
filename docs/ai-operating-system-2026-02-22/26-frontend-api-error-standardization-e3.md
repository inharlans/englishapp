# Frontend API Error Standardization (E-03)

Date: 2026-02-22

## Goal
- Standardize frontend API error parsing/throw behavior across `lib/api/*`.
- Keep call-site behavior unchanged while improving consistency and debuggability.

## Changes
- Added `lib/api/base.ts`
  - `ApiError` class with metadata: `status`, `source`, `code`
  - `parseApiResponse<T>(res, fallbackMessage, source)` helper
- Refactored all API modules to use shared parser:
  - `lib/api/admin.ts`
  - `lib/api/auth.ts`
  - `lib/api/blockedOwners.ts`
  - `lib/api/payments.ts`
  - `lib/api/quiz.ts`
  - `lib/api/study.ts`
  - `lib/api/users.ts`
  - `lib/api/wordbook.ts`
  - `lib/api/words.ts`

## Operational Notes
- Error handling is now centralized at the API module layer.
- Every API call now has a stable `source` key for troubleshooting.
- Response body parsing is resilient to empty/non-JSON responses.

## Validation
- `npm run typecheck` pass
- `npm run lint` pass
- `npm run mcp:cycle` pass
