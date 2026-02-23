---
name: workflow-router
description: Route tasks to required Codex skills using project guardrails ported from Claude skill-rules workflow.
---

# Workflow Router

## Purpose
Recreate Claude-style skill routing in Codex by producing:
- BLOCK requirements (critical guardrails only)
- REQUIRED-when-matched skills
- suggested skills
- required verification commands

## Step 1) Detect Scope
Classify task as one or more:
- backend_api
- backend_tests
- error_tracking
- skill_system
- frontend_ui
- docs_only

Use:
- user prompt keywords
- referenced file paths
- current changed files if available

## Step 2) BLOCK Rules (must run skill first)
If matched, output BLOCK and stop implementation until skill is applied.

### nextjs-frontend-guidelines (BLOCK)
Trigger:
- frontend UI/component architecture work
- keywords: next.js, app router, client component, server component, component architecture
- paths: `app/**`, `components/**`

### brand-guidelines (BLOCK when branding scope is explicit)
Trigger:
- keywords: branding, logo, brand color, presentation, deck
- paths: `**/*.pptx`, `docs/**/brand*`

## Step 3) REQUIRED-When-Matched (Claude suggest parity)
- fastapi-backend-guidelines
  - backend API/route/service/repository/domain/model/dto work
  - keywords: fastapi, router, endpoint, service, repository, asyncsession, pydantic
  - paths: `server/**`, `app/api/**`

- pytest-backend-testing
  - testing keywords: pytest, fixture, mock, coverage, failing tests, integration test
  - paths: `tests/**`, `server/**/*.test.*`, `app/api/**/*.test.*`

- error-tracking
  - sentry, captureException, monitoring, cron instrumentation
  - changes introducing try/catch logging or operational error boundaries

- skill-developer
  - skill/hook/routing policy work
  - keywords: skill-rules, hook, trigger, guardrail, activation, routing
  - paths: `.claude/**`, `.codex/**`, `.agents/**`, `AGENTS.md`

## Step 4) Suggested Skills
- If frontend UI wording/style/layout change:
  - suggest `frontend-design`
- If performance concern:
  - suggest `vercel-react-best-practices`

## Step 5) Required Checks
- Always require:
  - `npm run codex:workflow:check`
- If only docs changed:
  - allow lightweight path, but recommend `npm run hooks:validate`

## Output Format
- Scope:
- BLOCK:
- REQUIRED:
- Suggested skills:
- Required checks:
- Next:
