# Repository Agent Defaults

## Finish Checklist (Default)

For implementation tasks that change behavior or code:

1. Update `README.md` with concise, user-visible change notes.
2. Commit all related changes with a clear commit message.
3. Push the commit to the current branch on `origin`.

## Exceptions

- If the user explicitly says not to update README, not to commit, or not to push, follow the user request.
- If push fails due to auth/network/remote policy, report the exact failure and stop.

## Stable Test Command Policy

- For local E2E checks, always use the fixed runner scripts:
  - `npm run test:e2e:local`
  - `npm run test:e2e:local:smoke`
  - `npm run test:e2e:local:ui`
- Do not run ad-hoc inline PowerShell `Start-Process ... npm run dev ...` test commands unless the user explicitly requests it.
- Goal: keep command prefixes stable so approval rules remain reusable across new agent contexts.
- If test strategy or CI pipeline changes, agents may update this fixed pattern by editing:
  - `scripts/dev-and-test.ps1`
  - `package.json` scripts
  - CI workflow files and related docs (`README.md`, `AGENTS.md`)
- When updating the pattern, keep it stable/reusable (avoid one-off command variants), and document why it changed.

## Encoding Guardrail (UTF-8)

- All source/code/config/docs files must be saved as `UTF-8` (without BOM).
- Do not commit files encoded as ANSI/CP949/EUC-KR or UTF-16.
- Before finishing edits that touched text-heavy files, run a local production build once:
  - `npm run build`
- If using PowerShell to write files, use explicit UTF-8 output (no BOM) and avoid implicit default encodings.
- If a file shows mojibake or build errors like `stream did not contain valid UTF-8`, immediately re-save that file as UTF-8 and re-run `npm run build`.
