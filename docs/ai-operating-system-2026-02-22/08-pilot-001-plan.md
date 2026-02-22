# Pilot 001 Plan - Korean Prompt Routing Hardening

Date: 2026-02-22

## Goal
- Validate the operating system by running one full delivery cycle on a real change.
- Improve subagent routing behavior for Korean-first prompts so they never silently miss recommendations.

## Scope
- Target file: `C:\dev\englishapp\.claude\hooks\subagent-router.ps1`
- Non-goals:
  - Full Korean keyword NLP mapping
  - Auth/testing pipeline changes

## Approach
1. Stabilize router parsing (fix broken regex parsing path).
2. Add robust fallback rule:
  - If no rule matches, still recommend `planner` (never empty result).
3. Verify with Korean and unknown prompts.
4. Run standard quality cycle and record completion report.

## Risks
- Over-routing risk: unknown prompts may now default to `planner`.
- Mitigation: treat this as v1 safety mode and refine keyword classifier in next pilot.

## Acceptance Criteria
- Router no longer throws parser errors.
- Korean prompt returns at least one recommended agent.
- `npm run mcp:cycle` passes.
- Completion report generated.
