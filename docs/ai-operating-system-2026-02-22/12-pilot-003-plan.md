# Pilot 003 Plan - Auth Agent Chain Operationalization

Date: 2026-02-22

## Objective
- Move from "agent files exist" to "auth chain is executable and verifiable" for route-auth issues.

## Scope
- `C:\dev\englishapp\scripts\validate-hook-chains.js`
- `C:\dev\englishapp\package.json`
- `C:\dev\englishapp\.claude\hooks\subagent-router.ps1`
- `C:\dev\englishapp\.claude\hooks\plan-gate-prompt.ps1`
- `C:\dev\englishapp\.claude\hooks\plan-gate-pretool.ps1`

## Execution Model
- Trigger prompt with auth-route failure keywords -> router must recommend:
  - `auth-route-debugger`
  - `auth-route-tester`
- For major implementation prompt:
  - plan gate must switch session state to `requirePlan=true`
  - pretool edit to code path must block (`exit 2`)
- For approval prompt:
  - plan gate must switch session state to `requirePlan=false`
  - pretool edit to code path must allow (`exit 0`)

## Acceptance
- `npm run hooks:validate` returns PASS.
- Output includes route-auth chain recommendation and plan-gate block/unblock path.
- State file under `.claude/hooks/state/` ends in approved mode.
