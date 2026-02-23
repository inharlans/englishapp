# Scripts Layout

## Structure
- `scripts/dev/`
  - Local development and test runners.
  - Examples: `dev-and-test.ps1`, `auth-smoke-test.ps1`, `test-auth-route.js`, `get-auth-token.js`, `install-githooks.mjs`
- `scripts/ops/`
  - Operational automation and validation.
  - Examples: `mcp-cycle.js`, `ops-readiness.js`, `validate-hook-chains.js`, `codex-workflow-guard.js`
- `scripts/data/`
  - Data ingestion/generation/cleanup utilities for wordbook datasets.
- `scripts/lib/`
  - Shared script-side helpers.

## Notes
- App runtime code remains in `app/` and `server/`.
- Script files are tooling and should stay under `scripts/` by concern.
