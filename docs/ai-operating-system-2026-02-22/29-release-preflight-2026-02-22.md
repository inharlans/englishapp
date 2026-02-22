# Release Preflight (2026-02-22)

## Scope
- Branch baseline includes refactor + ops automation series up to:
  - `b9ba89f`
  - `5a119be`
  - `44ebc68`

## Preflight Checks
1. `npm run typecheck` -> PASS
2. `npm run lint` -> PASS
3. `npm run ops:readiness` -> PASS
   - includes `hooks:validate`, `mcp:cycle`, `test:e2e:local:smoke`
4. `npx next build` -> PASS

## Known Local Issue
- `npm run build` failed locally with Prisma engine rename lock (`EPERM` on `query_engine-windows.dll.node.tmp*`).
- This is a local Windows file-lock issue in `prisma generate` step, not a Next.js compile failure.
- CI path remains valid because Linux runner in `.github/workflows/ci.yml` performs full build.

## Release Decision
- Status: `GO (conditional)`
- Condition:
  - Use CI green status as release gate for `npm run build` until local Prisma lock behavior is fully normalized.

## Recommended Release Steps
1. Push current branch and wait for CI pass.
2. If CI green, tag release commit.
3. Deploy and run post-deploy smoke:
   - `/login`
   - `/api/auth/me`
   - `/api/wordbooks/market`
   - `/api/admin/reports` (auth boundary check)
