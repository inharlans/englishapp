# Codex Audit Minimum Policy (2026-02-23)

Date: 2026-02-23  
Project: `englishapp`

## 1) Purpose
Define the minimum session-audit standard for Codex runs using `codex exec --json`.

## 2) Collection Method
Use non-interactive execution output as audit source.

Example:
```powershell
codex exec --json "run verify and summarize result" > .claude/ops-audit/codex-audit-<timestamp>.jsonl
```

## 3) Minimum Retained Fields
For each event/record, retain at least:
- `timestamp`
- `command` (or prompt/operation summary)
- `result` (`success` / `failure`)
- `verify_status` (`passed` / `failed` / `not-run`)

## 4) Storage Location
- Primary: `.claude/ops-audit/` (local operational artifacts)
- Optional mirror: CI artifacts for release-tagged runs

## 5) Retention Policy
- Keep last 30 days of local audit files.
- Keep 90 days for release-tagged CI audit artifacts.
- Remove older records on weekly maintenance cycle.

## 6) Operational Notes
- Do not store secrets or raw tokens in audit logs.
- If output includes sensitive values, redact before archival.
- Audit logs are supporting evidence; CI required checks remain primary quality gate.

