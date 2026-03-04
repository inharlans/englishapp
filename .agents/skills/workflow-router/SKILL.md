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

### Team Keyword Map (영영사 프로젝트)
- market, 마켓, 상품, 결제, purchase, portone -> UI/페이지/컴포넌트 문맥이면 `frontend_ui`, API/서비스 문맥이면 `backend_api`
- wordbook, 워드북, 단어장, meaning quality -> UI 문맥 `frontend_ui`, 데이터/정제/배치 문맥 `backend_api`
- clipper, 클리퍼, extension, 익스텐션, chrome extension -> UI 문맥 `frontend_ui`, API/내부엔드포인트 문맥 `backend_api`
- login, oauth, kakao, jwt, 인증 -> 기본 `backend_api` (UI/페이지/컴포넌트 문맥이면 `frontend_ui`)
- sentry, 장애, 오류, 에러 추적, tracing -> `error_tracking`
- skill, hook, trigger, routing, guardrail -> `skill_system`

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
