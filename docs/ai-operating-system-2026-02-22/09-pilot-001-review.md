# Pilot 001 Review - Korean Prompt Routing Hardening

Date: 2026-02-22
Target: `C:\dev\englishapp\.claude\hooks\subagent-router.ps1`

## Executive Summary
- Pilot completed with operational success.
- Router parsing failures were removed and no-prompt-match behavior now safely returns `planner`.
- Korean prompt tests no longer produce empty output.

## Findings
1. Critical
- A malformed regex line previously caused parser failures in PowerShell hook execution.
- Fixed by rewriting the matching block and restoring syntactic integrity.

2. Important
- Environment encoding made Korean keyword matching fragile.
- Added safe fallback policy (`planner`) so non-ASCII or unmatched prompts are not dropped.

3. Tradeoff
- Default `planner` recommendation on unknown prompts increases suggestion frequency.
- This is acceptable for v1 reliability; precision can be improved in pilot 002.

## Verification
- Manual hook tests:
  - Korean prompt -> `planner` recommendation confirmed
  - Unknown prompt -> `planner` recommendation confirmed
- Quality gate:
  - `npm run mcp:cycle` (to be executed in final verification step for this pilot)

## Next Step
- Pilot 002: Introduce robust Korean keyword mapping with encoding-safe token detection and reduce false-positive default routing.
