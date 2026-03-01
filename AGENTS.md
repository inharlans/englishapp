# Repository Agent Defaults

## Role
- This file defines only core agent rules briefly.
- Detailed procedures live in dedicated docs to avoid duplication.

## Agent Work Rules
- If task scope is unclear, run `$workflow-router` first (when available).
- If `$workflow-router` is unavailable, follow:
  - `docs/ai-operating-system-2026-02-22/39-codex-workflow-start-template.md`
- Do not claim verification unless commands were actually executed.

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

## Local Market Debug Policy (Persistent)

- For local market/wordbook debugging, always use the fixed setup/dev scripts:
  - `npm run local:market:setup`
  - `npm run local:market:dev`
- Do not use plain `npm run dev` for market-debug tasks unless local DB environment is explicitly configured in the current shell.
- Goal: avoid accidental use of production/remote `DATABASE_URL` from `.env` during local debugging.
- Reference doc:
  - `docs/local-debug-wordbook-market.md`

## Encoding Guardrail (UTF-8)

- All source/code/config/docs files must be saved as `UTF-8` (without BOM).
- Do not commit files encoded as ANSI/CP949/EUC-KR or UTF-16.
- Before finishing edits that touched text-heavy files, run a local production build once:
  - `npm run build`
- If using PowerShell to write files, use explicit UTF-8 output (no BOM) and avoid implicit default encodings.
- If a file shows mojibake or build errors like `stream did not contain valid UTF-8`, immediately re-save that file as UTF-8 and re-run `npm run build`.

## Language Policy (Docs + UI Copy)

- Because both users and admins are Korean, all user-visible application text must be written in Korean.
- `README.md` must be written in Korean.
- Other `.md` files may be written in English when appropriate.

## Codex Skill Routing (Claude Parity)

### Workflow Entry
- If task scope is unclear, run `$workflow-router` first.
- `$workflow-router` outputs:
  - Scope
  - BLOCK requirements
  - Required-when-matched skills
  - Suggested skills
  - Required checks

### Guardrails (Mandatory)
- BLOCK (critical guardrails only):
  - `nextjs-frontend-guidelines` for frontend UI/component architecture work.
  - Brand guideline skills only when branding/presentation scope is explicit.

- REQUIRED when matched (Claude suggest parity):
  - `fastapi-backend-guidelines` for backend API/service/repository/domain changes.
  - `pytest-backend-testing` for backend test authoring/debugging.
  - `error-tracking` for Sentry/error-monitoring/cron-instrumentation changes.
  - `skill-developer` for skill/hook/routing-rule changes.

- Suggested:
  - Use related domain skills based on router output.

- Enforcement intent:
  - `BLOCK` = must stop and apply the guardrail skill first.
  - `REQUIRED` = must apply when matched, but not hard-stop block.

### Required checks after code changes
- Always run:
  - `npm run codex:workflow:check`
- Do not claim verification unless commands were actually executed.

### Start/Finish Template
- Start:
  - "Run `$workflow-router`, decide scope/required skills/checks, then implement."
- Finish:
  - "Run `npm run codex:workflow:check` and summarize executed checks/results."
- Standard template doc:
  - `docs/ai-operating-system-2026-02-22/39-codex-workflow-start-template.md`

## Additional Repository Policies (Korean)

### 코드 수정 정책
- Route는 얇게 유지(입력 검증/인증/응답 매핑 중심).
- 비즈니스 로직은 `server/domain/**`, DB 접근은 repository 경유를 우선한다.
- 인코딩은 UTF-8(무 BOM) 고정.

### 테스트/스냅샷 정책
- 코드 변경 후 필수 검증: `npm run codex:workflow:check`
- 스냅샷은 의도된 계약 변경일 때만 갱신한다.

### 금지 영역
- 승인 없는 배포/시크릿 변경/파괴적 DB 작업 금지.
- `main` 직접 수정/직접 push 금지(브랜치 기반 작업).
- `git reset --hard` 금지, force push는 명시 승인 시에만 허용.

### 워크플로 단계
1. 범위 확인 (`$workflow-router` 또는 fallback 문서)
2. 구현 (강제 가드레일 준수)
3. 검증 (`npm run codex:workflow:check`)
4. 보고 (변경 요약 + 실제 실행한 검증 결과)

### 작업 우선순위
1. 보안/데이터 무결성
2. 계약 안정성(API/스냅샷)
3. 인코딩/훅/게이트 통과
4. 기능/성능 개선
5. 문서 동기화

### 코딩 스타일
- TypeScript strict, 2-space, LF, UTF-8.
- 사용자 노출 문구와 `README.md`는 한국어 우선.
- 기존 아키텍처/네이밍/계층 경계를 우선 존중한다.

### 금지 사항
- 무관 파일 대량 수정 금지.
- 근거 없는 포맷 churn/광범위 리네이밍 금지.
- 민감정보(토큰/시크릿) 로그/문서 기록 금지.

### 커밋 규칙
- 변경은 관련 단위로 작게 묶어 커밋한다.
- 게이트 실패 상태에서는 커밋하지 않는다.
- 기본은 Finish Checklist를 따른다. 사용자가 명시적으로 하지 말라고 하면 중단한다.

### Git Identity Fallback (No git config changes)
- 커밋/푸시 과정에서 사용자 이름/이메일 누락으로 실패하면, `git config`를 수정하지 않는다.
- 현재 세션 환경변수로만 작성자/커미터를 지정한다.
- 기본값:
  - `GIT_AUTHOR_NAME=inharlans`
  - `GIT_AUTHOR_EMAIL=nhtgb021030@gmail.com`
  - `GIT_COMMITTER_NAME=inharlans`
  - `GIT_COMMITTER_EMAIL=nhtgb021030@gmail.com`
- PowerShell 예시:
  - `$env:GIT_AUTHOR_NAME='inharlans'`
  - `$env:GIT_AUTHOR_EMAIL='nhtgb021030@gmail.com'`
  - `$env:GIT_COMMITTER_NAME='inharlans'`
  - `$env:GIT_COMMITTER_EMAIL='nhtgb021030@gmail.com'`
- 커밋 후 확인:
  - `git log -1 --format='%an <%ae>'`

### 보안 제약
- 최소 권한 원칙(MCP/토큰/DB read-only 우선).
- 시크릿은 저장소 커밋 금지, 비밀 저장소에서만 관리.
- 운영 데이터 접근은 문서화된 절차만 사용한다.

### 상세 문서
- 리팩터링/계층 경계: `docs/refactor-execution-playbook-2026-03-01.md`
- MCP 권한/운영: `docs/mcp-access-policy-2026-02-28.md`, `docs/mcp-runbook.md`
- 게이트/훅: `.githooks/pre-commit`, `scripts/ops/codex-workflow-guard.js`
- 위험 명령 정책: `.codex/rules/default.rules`
