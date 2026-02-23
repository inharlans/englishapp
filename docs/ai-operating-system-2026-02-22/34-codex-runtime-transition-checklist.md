# Codex Runtime Transition Checklist (2026-02-23)

Date: 2026-02-23  
Project: `englishapp`  
Owner: Platform/AI Ops

## 1) Scope Confirmation
- [x] Claude hooks are documented as reference only (`.claude/settings.json` not Codex runtime control).
- [x] Codex runtime control source is identified (`.codex/*`, CI workflows, npm scripts).

## 2) Codex Policy Configuration
- [x] Bootstrap Codex config in repo:
- [x] Create `.codex/`
- [x] Initial setup: create `.codex/rules/default.rules` if missing
- [x] Operational maintenance: update `.codex/rules/default.rules` as the project-local source of truth
- [x] Capture real execution prefixes in this environment (e.g. full PowerShell executable path) and finalize rule patterns from captured values
- [x] Matcher policy note documented:
- [x] Rule matcher command and validation command must share the same base command signature (no alias mismatch); safety-only options (e.g. `-WhatIf`, `--dry-run`) are allowed. Exception: if tokenized matcher is unreliable, apply the fallback procedure section.
- [x] Add prompt/forbid rules for high-risk commands:
- [x] `Remove-Item -Recurse -Force` prompt required (matcher includes actual execution prefix path, e.g. `shell_command` -> PowerShell command line)
- [x] `git reset --hard` forbidden (team standard, no prompt fallback)
- [x] `git push --force` prompt required
- [x] `git push --force-with-lease` prompt required
- [ ] Validate policy behavior with explicit non-destructive test commands:
- [ ] Test harness setup: create disposable path `.\\_policy_test_tmp` before validation
- [ ] Local Windows PowerShell validation command (Windows-only procedure):
- [ ] `Remove-Item -Recurse -Force .\\_policy_test_tmp -WhatIf` -> prompt shown (safe matcher validation in PowerShell)
- [ ] Bash alternative (if applicable, non-destructive): run in isolated sandbox and verify prompt/block using command simulation (example: `echo rm -rf ./_policy_test_tmp`)
- [ ] `git reset --hard --help` -> blocked (forbidden policy)
- [ ] Prerequisite for push-policy test: use dedicated test remote/branch with disposable history
- [ ] `git push --force --dry-run` -> prompt shown (run only on dedicated test remote/branch)
- [ ] `git push --force-with-lease --dry-run` -> prompt shown (run only on dedicated test remote/branch)
- [ ] Validation verdict rule documented: pass/fail is determined by policy prompt/block visibility, not by command stdout/stderr text variance
- [ ] Fallback rule rollout: if tokenized matcher is unreliable, add command-string regex fallback rules for equivalent policy intent
- [ ] Fallback verification: confirm regex fallback rules produce the same prompt/block behavior as prefix rules
- [ ] Test harness cleanup: remove disposable path `.\\_policy_test_tmp` after validation
- [ ] Final real-action check (non-production only): run one isolated branch validation to confirm prompt/block behavior with real command execution

## 3) Verification Pipeline Unification
- [x] Prerequisite: add `verify` script to `package.json` before running `npm run verify`.
- [x] `package.json` has `verify` script (`lint + typecheck + test`).
- [x] Optional: `verify:ci` exists for CI-specific flags.
- [x] Local run check:
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test` (or documented alternative)
- [x] `npm run verify` passes end-to-end.
- [x] Evidence capture rule defined:
- [x] Primary evidence: CI required check success (GitHub Actions CI run `22294209290` passed on 2026-02-23)
- [x] Secondary evidence: PR template checkbox or merge note

## 4) CI Gate Hardening
- [x] Transition mapping documented:
- [x] Current CI jobs/steps (`typecheck`, `build`, `test`, `ops:readiness`)
- [x] Current gap explicitly documented: `lint` step is missing in current CI
- [x] Target gate (`verify`) or equivalent required-check mapping including `lint`
- [x] CI workflow requires verify gate (or mapped equivalent) before merge/deploy.
- [x] CI fails on verify failure (no fail-open for release branch).
- [x] CI logs clearly surface first failing step.
- [ ] Branch protection rule references required CI checks. (Manual/GitHub settings step; API check returned 403 plan restriction)

## 5) Operational Documentation
- [x] Runbook updated with "Codex validation flow".
- [x] Failure playbook added:
- [x] typecheck failure
- [x] lint failure
- [x] test failure
- [x] rollback or hotfix decision criteria
- [x] Team-facing note added: Claude hook files are not a Codex guarantee.

## 6) Optional Audit Layer
- [ ] Evaluate `codex exec --json` logging for session audit.
- [ ] Define minimal retained fields (timestamp, command, result, verify status).
- [ ] Define retention policy and storage location.

## 7) Exit Criteria
- [x] At least one PR merged with new Codex policy + verify gate.
- [ ] At least one deployment executed with CI verify green.
- [x] Post-deploy checklist completed with no unresolved blocker.

## 8) Sign-off
- [ ] Platform owner sign-off
- [ ] Backend owner sign-off
- [ ] Frontend owner sign-off
- [ ] Ops owner sign-off
