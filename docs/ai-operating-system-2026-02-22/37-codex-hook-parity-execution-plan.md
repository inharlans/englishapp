# Codex Hook Parity Execution Plan (2026-02-23)

## 1) Goal
- Match the practical outcome of AHW Claude hook workflow in Codex sessions:
- `UserPromptSubmit/PostToolUse/Stop` intent is preserved as Codex-operational gates.
- Any code change must pass:
- `npm run hooks:validate`
- `npm run verify`

## 2) Design
- Runtime truth for Codex:
- Local command gate: `scripts/ops/codex-workflow-guard.js`
- Git commit gate: `.githooks/pre-commit`
- CI gate: existing `npm run verify:ci`
- Claude hook files remain compatibility/reference layer.

## 3) Enforcement Path
1. Developer edits files.
2. `git commit` triggers `.githooks/pre-commit`.
3. `pre-commit` runs `npm run codex:precommit`.
4. `codex:precommit` runs `codex-workflow-guard.js`.
5. Guard checks changed files and, if relevant, runs:
   - `hooks:validate`
   - `verify`
6. On any failure: commit is blocked.

## 4) Install Step
- Run once per clone:
- `npm run codex:hooks:install`

## 5) Operational Notes
- If only non-runtime docs changed, guard skips by design.
- If runtime files changed, commit cannot proceed without green verification.
- This gives Codex sessions a deterministic equivalent to hook-driven quality flow.

## 6) Checklist
- [ ] `npm run codex:hooks:install` executed.
- [ ] `git config --get core.hooksPath` returns `.githooks`.
- [ ] Runtime file change blocks commit when `verify` fails.
- [ ] Runtime file change passes commit when `hooks:validate` and `verify` pass.
- [ ] CI remains green with `verify:ci`.
