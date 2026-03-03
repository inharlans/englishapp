# Repository Agent Defaults

## Purpose
- This document is the canonical operating guide for agentic coding assistants working in this repository.
- It consolidates prior AGENTS rules plus the 2026-03-03 codebase analysis addendum.
- When rules conflict, follow precedence: user explicit instruction > this file > tool/runtime defaults.

## Scope and Rule Sources
- Core repo/runtime sources reviewed for this guide:
  - `package.json`
  - `.editorconfig`
  - `tsconfig.json`
  - `.eslintrc.json`
  - `eslint.config.mjs`
  - `vitest.config.ts`
  - `.githooks/pre-commit`
  - `.codex/rules/default.rules`
- Cursor rule files:
  - `.cursor/rules/` not found
  - `.cursorrules` not found
- Copilot rule files:
  - `.github/copilot-instructions.md` not found
- Conclusion:
  - No extra Cursor/Copilot instruction files exist; use this `AGENTS.md` + repo hooks/guards as single source of truth.

## Workflow Entry
- If task scope is unclear, run `$workflow-router` first (when available).
- If `$workflow-router` is unavailable, follow:
  - [Codex Workflow Start Template](docs/ai-operating-system-2026-02-22/39-codex-workflow-start-template.md)
- Start template:
  - "Run `$workflow-router`, decide scope/required skills/checks, then implement."
- Finish template:
  - "Run `npm run codex:workflow:check` and summarize executed checks/results."
- Never claim verification unless commands were actually executed.

## Skill Routing and Guardrails

### BLOCK (must apply first)
- `nextjs-frontend-guidelines` for frontend UI/component architecture work.
- `brand-guidelines` only when branding/presentation scope is explicit.

### REQUIRED when matched
- `fastapi-backend-guidelines` for backend API/service/repository/domain changes.
- `pytest-backend-testing` for backend test authoring/debugging.
- `error-tracking` for Sentry/error-monitoring/cron instrumentation changes.
- `skill-developer` for skill/hook/routing-rule changes.

### Suggested
- Use domain-matched skills from router output.

### Enforcement intent
- `BLOCK`: stop and apply guardrail skill first.
- `REQUIRED`: must apply when matched, but not hard-stop if routing layer cannot enforce.

## Command Reference

### Build / run
- Install deps: `npm ci`
- Dev server: `npm run dev`
- Production build: `npm run build`
- Production start: `npm run start`

### Lint / type / verification
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Unit tests (all): `npm test`
- Full verify: `npm run verify`
- Workflow guard (required after code changes): `npm run codex:workflow:check`

### E2E suites
- Smoke HTTP: `npm run test:e2e`
- Clipper flow: `npm run test:e2e:clipper`
- Clipper extension flow: `npm run test:e2e:clipper:extension`
- UI flow: `npm run test:e2e:ui`

## Single-Test Execution (Important)

### Vitest single-file
- `npm test -- app/api/auth/login/route.test.ts`
- `npx vitest run app/api/auth/login/route.test.ts`

### Vitest by test name
- `npm test -- -t "returns auth response when unauthenticated"`
- `npm test -- app/api/admin/metrics/route.test.ts -t "returns stable snapshot when clipper payload exists"`

### Snapshot update (only when contract change is intentional)
- `npm test -- -u`
- `npx vitest run -u app/api/admin/metrics/route.test.ts`

### Recommended execution order
- 1) Run the nearest single test first.
- 2) Run related domain tests.
- 3) Run `npm run codex:workflow:check`.
- 4) If text-heavy files were edited, run `npm run build` once.

## Stable Test Command Policy
- For local E2E checks, prefer fixed runner scripts:
  - `npm run test:e2e:local`
  - `npm run test:e2e:local:smoke`
  - `npm run test:e2e:local:ui`
- Avoid ad-hoc inline PowerShell `Start-Process ... npm run dev ...` test commands unless explicitly requested.
- Goal: keep command prefixes stable so approval rules remain reusable across agent contexts.

## Local Market Debug Policy
- For local market/wordbook debugging, use:
  - `npm run local:market:setup`
  - `npm run local:market:dev`
- Do not default to plain `npm run dev` for market-debug tasks unless local DB env is explicitly configured in current shell.
- Reference:
  - [Local Debug: Wordbook Market](docs/local-debug-wordbook-market.md)

## Code Style and Formatting

### Formatting baseline
- Encoding: UTF-8 without BOM.
- End of line: LF.
- Indent: 2 spaces.
- Final newline: required.
- `.md` files may keep trailing whitespace where needed.

### TypeScript baseline
- `strict: true` and `allowJs: false` are the project defaults.
- Path alias `@/*` is standard.
- Avoid `any`; if unavoidable, keep scope minimal and document reason.
- Prefer explicit input/output typing on public functions and service boundaries.
- Validate runtime input at boundaries (Zod-based patterns preferred).

### Import conventions
- Order imports as:
  - external/Node modules
  - blank line
  - internal `@/` modules
- Use `import type` for type-only imports.
- Keep type and value imports readable and intentionally grouped.

### Naming conventions
- React components: PascalCase (e.g., `LoginPanel.tsx`).
- Route handlers: Next App Router convention in `route.ts`.
- Tests: target filename + `.test.ts`.
- Variables/functions: `camelCase`.
- Constants: `UPPER_SNAKE_CASE`.

### Function and structure conventions
- Prefer guard clauses and early returns.
- Extract parsing/normalization/mapping into small pure helpers.
- Avoid deep nesting when condition-based returns are clearer.
- For collection logic, use explicit intermediate names with `map/filter/reduce`.

## API and Error Handling Standards

### Response model
- Prefer shared error helper: `errorJson(...)`.
- Keep error payload shape consistent when possible (`ok`, `code`, `message`, `error`, optional `details`).
- Maintain stable error code strings (`RATE_LIMITED`, `AUTH_*`, etc.).

### Status code defaults
- 400: invalid input/validation failure
- 401: unauthenticated
- 403: forbidden/policy blocked
- 429: rate-limited

### Exception handling
- Route handlers should map known failures to explicit HTTP responses.
- Do not leak raw internal errors to users.
- Record observability data (`captureAppError`, `recordApiMetric`) where applicable.

### Input/auth helpers
- Use `parseJsonWithSchema` + Zod for JSON body validation.
- Use common param parsers (e.g., positive int parser patterns).
- Use `requireUserFromRequest`-style helpers for auth gating.

## Architecture Boundaries
- Route layer (`app/api/**/route.ts`): auth, validation, service orchestration, response mapping.
- Domain service layer (`server/domain/**/service.ts`): business rules and orchestration.
- Repository layer (`server/domain/**/repository.ts`): Prisma/DB access encapsulation.
- Avoid:
  - direct Prisma expansion in route handlers
  - embedding business logic directly into route files

## Testing Policy
- Framework: Vitest (`environment: node`, includes `**/*.test.ts`).
- Test style:
  - clear scenario names in `describe/it`
  - isolate dependencies with `vi.mock`
  - reset mocks in `beforeEach`
- API route tests should verify both status code and core response shape.
- Snapshot policy:
  - update only for intentional contract/message changes
  - if snapshot drift is unintentional, fix logic first; do not auto-refresh snapshots
  - if snapshot is updated intentionally, include one-line reason in PR/commit notes

## Encoding Guardrail (Mandatory)
- All source/config/docs text files must be UTF-8 without BOM.
- Do not commit ANSI/CP949/EUC-KR/UTF-16 files.
- For text-heavy edits, run `npm run build` before finishing.
- If mojibake or `stream did not contain valid UTF-8` occurs, re-save file as UTF-8 and re-run build.

## Language Policy (Docs + UI Copy)
- User-visible application text must be Korean (users/admins are Korean).
- `README.md` must remain Korean.
- Other `.md` files may be English when appropriate.

## Security and Git Guardrails

### Forbidden / approval-gated operations
- Forbidden: `git reset --hard`.
- Approval required: `git push --force`, `git push --force-with-lease`.
- Destructive recursive deletion commands require explicit approval.

### General security rules
- Follow least privilege for MCP/tokens/DB access.
- Never commit secrets/tokens/credentials.
- Use documented procedures for production data access.

### Branch policy
- No direct work on `main`/direct push to `main`; use branch-based workflow.

## Pre-commit / Gate Chain
- Pre-commit runs:
  - `npm run hooks:validate`
  - `npm run compact:sync`
  - `npm run codex:precommit`
- If `docs/compact-context.md` changes during hook, it is auto-staged by hook logic.

## Finish Checklist (Default)
- For implementation tasks that change behavior/code:
  - 1) Update `README.md` with concise user-visible changes.
  - 2) Commit related changes with clear message.
  - 3) Push commit to current branch on `origin`.
- Exceptions:
  - if user explicitly says not to update README/commit/push, follow user instruction.
  - if push fails due to auth/network/policy, report exact failure and stop.

## Agent Working Checklist
- 1. Confirm scope/routing (`$workflow-router` or fallback template).
- 2. Implement with architecture boundaries and guardrails.
- 3. Run required checks (`npm run codex:workflow:check` minimum).
- 4. For larger textual changes, run `npm run build` once.
- 5. Report only checks actually executed.

## Additional Repository Policies (Korean)

### Code Change Policy
- Keep routes thin (focused on input validation, authentication, and response mapping).
- Prefer `server/domain/**` for business logic, and repository-mediated DB access.
- Keep text encoding fixed to UTF-8 (without BOM).

### Test/Snapshot Policy
- Required verification after code changes: `npm run codex:workflow:check`.
- Update snapshots only for intentional contract changes (API/response/error/messages).
- If the snapshot change is not intentional, do not commit snapshots; fix the root cause first.

### Restricted Areas
- No unapproved deployments, secret changes, or destructive DB operations.
- No direct edits/pushes to `main`.
- `git reset --hard` is forbidden; force push is allowed only with explicit approval.

### Workflow Steps
- 1. Confirm scope (`$workflow-router` or fallback documentation)
- 2. Implement (follow mandatory guardrails)
- 3. Verify (`npm run codex:workflow:check`)
- 4. Report (change summary + actual verification results)

### Work Priorities
- 1. Security/data integrity
- 2. Contract stability (API/snapshots)
- 3. Encoding/hooks/gate compliance
- 4. Feature/performance improvements
- 5. Documentation sync

### Prohibited Actions
- Do not mass-edit unrelated files.
- Avoid unjustified format churn or large-scale renaming.
- Never log/document sensitive data (tokens/secrets).

## Git Identity Fallback (No git config changes)
- If commit/push fails due to missing author identity, do not edit `git config`.
- Use session env vars only:
  - `GIT_AUTHOR_NAME=inharlans`
  - `GIT_AUTHOR_EMAIL=nhtgb021030@gmail.com`
  - `GIT_COMMITTER_NAME=inharlans`
  - `GIT_COMMITTER_EMAIL=nhtgb021030@gmail.com`
- Verify after commit:
  - `git log -1 --format='%an <%ae>'`

## Quick Routing Map
- Scope ambiguous:
  - `$workflow-router` -> [Codex Workflow Start Template](docs/ai-operating-system-2026-02-22/39-codex-workflow-start-template.md)
- Backend/layer refactor:
  - [Refactor Execution Playbook](docs/refactor-execution-playbook-2026-03-01.md)
- Local market/wordbook debug:
  - [Local Debug: Wordbook Market](docs/local-debug-wordbook-market.md)
- MCP access policy:
  - [MCP Access Policy](docs/mcp-access-policy-2026-02-28.md)
- MCP operations/runbook:
  - [MCP Operations Runbook](docs/mcp-runbook.md)
- Hook/gate diagnostics:
  - [pre-commit hook](.githooks/pre-commit)
  - [codex-workflow-guard](scripts/ops/codex-workflow-guard.js)
  - [default.rules](.codex/rules/default.rules)

## Final Principle
- This file is intentionally explicit to minimize agent ambiguity.
- Keep this document updated whenever build/test/style/security workflow changes.
