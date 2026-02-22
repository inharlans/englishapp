# Scripts Layout

## Structure
- `scripts/dev/`
  - Local development and test runners.
  - Example: `dev-and-test.ps1`
- `scripts/ops/`
  - Operational automation and validation.
  - Examples: `mcp-cycle.js`, `ops-readiness.js`, `validate-hook-chains.js`
- `scripts/data/`
  - Data ingestion/generation/cleanup utilities for wordbook datasets.
- `scripts/lib/`
  - Shared script-side helpers.

## Notes
- App runtime code remains in `app/` and `server/`.
- Script files are tooling and should stay under `scripts/` by concern.
