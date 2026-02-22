# Pilot 002 Review - Korean Routing Precision

Date: 2026-02-22

## Summary
- Pilot succeeded for escaped-Korean input path and gate behavior.
- Router now resolves Korean category prompts to specialized agents.
- Plan-gate now correctly distinguishes major-task vs approval prompts.

## Verified Outcomes
- `프론트 에러` -> `frontend-error-fixer`
- `깃허브 이슈 조사` -> `web-research-specialist`
- `문서화` -> `documentation-architect`
- `리팩토링` -> `refactor-planner`
- `대규모 기능 구현 시작` -> block (`exit 2`)
- `계획 승인` -> unblock (`exit 0`)

## Key Fixes
- Raw UTF-8 stdin decode from `OpenStandardInput()`.
- `\\uXXXX` unescape before normalization/matching.
- Approval regex narrowed to explicit approval phrases.
