# Pilot 002 Plan - Korean Routing Precision

Date: 2026-02-22

## Objective
- Improve Korean prompt routing precision without breaking hook stability.

## Scope
- `C:\dev\englishapp\.claude\hooks\subagent-router.ps1`
- `C:\dev\englishapp\.claude\hooks\plan-gate-prompt.ps1`

## Changes
- Add UTF-8 raw stdin decoding path.
- Add escaped-unicode unescape path (`\\uXXXX`).
- Add Korean keyword contains-based matching for router categories.
- Tighten plan-gate approval rule to explicit approval phrases only.

## Acceptance
- Korean escaped prompt routes to specialized agents:
  - frontend, research, docs, refactor
- Korean major-task prompt blocks edits.
- Korean approval prompt unblocks edits.
