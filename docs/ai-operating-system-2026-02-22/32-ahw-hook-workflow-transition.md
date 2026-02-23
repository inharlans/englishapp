# AHW Hook Workflow Transition (2026-02-23)

Date: 2026-02-23  
Project: `englishapp`  
Reference baseline: `advanced-harness-window` (`.claude/hooks`, `.claude/settings.json`)

## 1) Objective
- Align hook lifecycle to AHW-style event flow:
- `UserPromptSubmit` -> skill activation
- `PostToolUse` -> tool/file tracking
- `Stop` -> lightweight quality stop checks
- Remove legacy non-AHW hook path from active runtime flow.

## 2) Active Hook Topology (Current)
- `UserPromptSubmit`
  - `node "$CLAUDE_PROJECT_DIR/.claude/hooks/skill-activation-prompt.mjs"`
- `PostToolUse`
  - matcher: `Edit|Write|MultiEdit|NotebookEdit|apply_patch|shell_command|Bash`
  - `node "$CLAUDE_PROJECT_DIR/.claude/hooks/post-tool-use-tracker.mjs"`
- `Stop`
  - `node "$CLAUDE_PROJECT_DIR/.claude/hooks/tsc-check.mjs"`
  - `node "$CLAUDE_PROJECT_DIR/.claude/hooks/trigger-build-resolver.mjs"`

Source of truth: `.claude/settings.json`

## 3) Added/Updated Files
- Added:
  - `.claude/hooks/skill-activation-prompt.mjs`
  - `.claude/hooks/post-tool-use-tracker.mjs`
  - `.claude/hooks/tsc-check.mjs`
  - `.claude/hooks/trigger-build-resolver.mjs`
  - `.claude/hooks/package.json`
  - `.claude/skills/skill-rules.json`
- Updated:
  - `.claude/settings.json`
  - `scripts/ops/validate-hook-chains.js` (AHW hook chain validation mode)

## 4) Deactivated Legacy Path
- Removed legacy PowerShell hook scripts from active system:
  - `.claude/hooks/plan-gate-pretool.ps1`
  - `.claude/hooks/plan-gate-prompt.ps1`
  - `.claude/hooks/subagent-router.ps1`

Reason:
- These belonged to custom pretool gating/routing flow, not AHW baseline event model.
- Keeping both in active flow creates policy ambiguity and maintenance overhead.

## 5) Validation Standard (Current)
- Command:
  - `npm run hooks:validate`
- Validation coverage:
  - Skill activation hook output contract
  - PostToolUse tracker artifact generation (`.claude/tsc-cache/<session>/...`)
  - Stop hook executability (`tsc-check`, `trigger-build-resolver`)
  - Encoding guard via `scripts/ops/validate-text-encoding.js`
- Expected output:
  - `hook-chain-validation: PASS`
  - `mode=ahw-userprompt-posttool-stop`

## 6) Operational Notes
- `PostToolUse` matcher intentionally includes `apply_patch`, `shell_command`, `Bash` to ensure tracking parity with practical edit paths.
- Stop hooks are fail-open by design in this repo to avoid blocking normal stop flow.
- Skill activation uses `.claude/skills/skill-rules.json` as rule source.

## 7) Rollback Guide
If rollback is needed:
1. Restore previous `.claude/settings.json`.
2. Reintroduce legacy hook scripts if policy requires pretool gating.
3. Re-run:
   - `npm run hooks:validate`
   - `npm run ops:readiness`
4. Confirm CI/ops checks are green before re-deploy.
