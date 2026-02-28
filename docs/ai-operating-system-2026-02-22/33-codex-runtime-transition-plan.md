# Codex Runtime Transition Plan (2026-02-23)

Date: 2026-02-23  
Project: `englishapp`  
Scope: Replace Claude-only hook lifecycle dependency with Codex-native enforcement and verification workflow.

## 1) Goal
- Ensure quality gates (`lint`, `typecheck`, test) are enforced in Codex sessions without relying on `.claude/settings.json` runtime hooks.
- Standardize operational flow so tool execution, risky commands, and release checks are auditable and reproducible.

## 2) Current Problem
- Current hook chain (`UserPromptSubmit`, `PostToolUse`, `Stop`) is defined in `.claude/settings.json`.
- This hook model is not executed by Codex runtime.
- Result: hook files can exist but do not guarantee automatic execution in Codex sessions.

## 3) Target Operating Model (Codex-Native)
1. Policy layer:
- Use project-local Codex rules (`.codex/rules/default.rules`) for risky command gating and command approval behavior.
2. Verification layer:
- Enforce `npm run verify` pipeline (`lint` + `typecheck` + tests) via local scripts and CI.
3. Automation layer:
- Use `codex exec --json` and scripted log parsing for session-level audit (optional phase, after baseline stabilization).
4. Documentation layer:
- Keep `.claude/*` as reference/compatibility docs only, not runtime source of truth for Codex.

## 4) Deliverables
- `docs/ai-operating-system-2026-02-22/34-codex-runtime-transition-checklist.md`
- Codex policy file:
  - `.codex/rules/default.rules` (project-local source of truth)
- Unified verify command in `package.json`:
  - `verify`, `verify:ci` (if needed)
- CI workflow update:
  - Mandatory pass on verify pipeline before merge/deploy
- Runbook update:
  - Add "Codex session validation" section and failure handling steps
- Evidence model update:
  - Define how "verify executed" is proven (CI required check as primary evidence, PR template as secondary evidence)

## 5) Execution Phases
### Phase A: Baseline Freeze
- Inventory current Claude hooks and mark runtime relevance.
- Confirm no business-critical gate depends only on `.claude/hooks/*`.

### Phase B: Codex Policy Setup
- Bootstrap project Codex config:
  - Create `.codex/`
  - Create `.codex/rules/default.rules`
- Define risky command policy (`Remove-Item -Recurse -Force`, `git reset --hard`, force push, etc.) in Codex rules.
  - Matcher must follow actual execution prefix (`shell_command` -> PowerShell command line), not only inner alias text.
  - Team baseline: `git reset --hard` is forbidden (no prompt fallback)
- Confirm approval prompts are triggered as intended.

Concrete Codex rules example (project-local `.codex/rules/default.rules`):
```starlark
# NOTE: Replace prefix values with real command prefixes captured in your environment.
# Example: "powershell" may actually be
# "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe".
# Platform selection: use PowerShell-prefixed rules on Windows agents and shell-prefixed rules on Bash/Linux agents.
prefix_rule(
  pattern=["powershell", "-Command", "Remove-Item", "-Recurse", "-Force"],
  decision="prompt",
  justification="Destructive delete needs explicit approval."
)

# Alternate example for environments using absolute PowerShell executable prefix.
prefix_rule(
  pattern=["C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", "-Command", "Remove-Item", "-Recurse", "-Force"],
  decision="prompt",
  justification="Destructive delete needs explicit approval."
)

# Fallback rule: if tokenized prefix matching is unreliable in runtime,
# switch to full command-string regex matching for equivalent policy intent.

prefix_rule(
  pattern=["git", "reset", "--hard"],
  decision="forbidden",
  justification="Hard reset is blocked by team policy."
)

prefix_rule(
  pattern=["git", "push", "--force-with-lease"],
  decision="prompt",
  justification="Force push requires explicit approval."
)

prefix_rule(
  pattern=["git", "push", "--force"],
  decision="prompt",
  justification="Force push requires explicit approval."
)
```

### Phase C: Verification Standardization
- Add/normalize `npm run verify`.
- Ensure local and CI use the same command chain.
- Fail build on verify failure.
- Map transition state explicitly:
  - Current CI: separate steps (`typecheck`, `build`, `test`)
  - Current gap: `lint` step is missing
  - Target CI: required `verify` gate (or documented equivalent mapping that includes `lint`)

### Phase D: Auditability Upgrade
- Add optional session log collector (`codex exec --json` parser).
- Store minimal audit artifacts under `docs/.../reports` or CI artifacts.

### Phase E: Cutover and Deprecation
- Mark `.claude/settings.json` hooks as "Claude-only compatibility".
- Update team docs: Codex path is primary operating path.

## 6) Acceptance Criteria
- Baseline status (2026-02-23): Not met yet. Current CI does not enforce `verify`/`lint` as required gate.
- Codex session with code edits is considered valid only when CI required check passes (`verify` job or equivalent mapped checks including `lint`, `typecheck`, `test`).
- Risky destructive commands are prompt-gated or forbidden by Codex rules (per command policy baseline).
- CI blocks merge on verify failure.
- Runbook clearly describes operator actions on verify/build failure.

## 7) Risks and Mitigations
- Risk: Team assumes `.claude/hooks/*` auto-run in Codex.
- Mitigation: Explicit docs and checklist item requiring Codex policy verification.

- Risk: Local pass but CI fail due to env mismatch.
- Mitigation: Keep `verify` command identical in local and CI; pin node/npm versions.

- Risk: Overly strict rules reduce productivity.
- Mitigation: Start with high-risk commands only; tighten incrementally.

## 8) Decision Log
- Decision: Treat Claude hooks as optional compatibility layer, not primary control plane.
- Decision: Move enforcement responsibility to Codex rules + CI gates.
