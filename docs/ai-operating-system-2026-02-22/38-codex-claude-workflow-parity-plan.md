# Codex Claude Workflow Parity Plan (2026-02-23)

## 1) 목적
- `advanced-harness-window`의 Claude 워크플로우 체감(규칙 강제 + 품질 게이트 + 브라우저 검증 + 라우팅)을
  현재 `englishapp` Codex 운영체계에 맞게 재현한다.
- 기존에 이미 적용된 Codex 게이트(`codex:workflow:check`, `pre-commit`, `hooks:validate`, `verify`, `ai:review:gate`)와 충돌 없이 확장한다.

## 2) 현재 상태 요약 (englishapp 기준)
- 이미 적용됨:
  - `AGENTS.md` 프로젝트 규칙 파일
  - `.githooks/pre-commit` + `core.hooksPath=.githooks`
  - `scripts/ops/codex-workflow-guard.js`
  - `hooks:validate` + `verify` + `ai:review:gate` 체인
- 현재 AI 게이트 정책:
  - staged diff 기준 Codex 리뷰 실행
  - `P0/P1` 발견 시 차단, `P2/P3`는 경고

## 3) 적용 원칙
- 원칙 1: Claude 훅 구조를 "동일 구현"이 아니라 "동일 효과"로 이식한다.
- 원칙 2: 기존 게이트를 폐기하지 않고, 라우팅/스킬/브라우저 검증 규칙을 상위 정책으로 추가한다.
- 원칙 3: 프로젝트 실구조에 맞춘다.
  - 본 저장소는 AHW처럼 `backend/`, `frontend/` 모노레포가 아님.
  - 본 저장소는 Next.js 단일 앱 + `server/` 도메인 구조이므로 명령/스킬 정의를 이에 맞춰야 한다.

## 4) 목표 아키텍처

### A) 규칙 계층
- `AGENTS.md`:
  - 비협상 규칙(브라우저 검증 기준, 품질 게이트, 보고 규칙) 선언
- `.codex/rules/default.rules`:
  - 위험 명령 정책(삭제/강제 푸시/하드 리셋)

### B) 실행 계층
- `npm run codex:workflow:check`:
  - `hooks:validate` -> `verify` -> `ai:review:gate` 순차 실행
- `.githooks/pre-commit`:
  - 커밋 전 워크플로우 강제

### C) 스킬/라우팅 계층
- 프로젝트 문서형 스킬(실행 가이드)을 추가하고, 실제 실행은 npm scripts로 고정
- `workflow-router` 성격의 문서/스크립트를 추가해 작업 시작 시 required checks를 결정

## 5) 단계별 실행 계획

### Phase 1: 규칙 정합성 확정
1. `AGENTS.md`에 다음 항목을 명시
   - UI 검증 주장 시 브라우저 증거 의무
   - 수정 후 필수 체크(`codex:workflow:check`)
   - 실패 시 수정/재실행/요약 보고
2. 기존 규칙과 중복/충돌 문구 제거

완료 기준:
- `AGENTS.md`만 읽어도 작업 규칙/검증 기준이 즉시 이해됨

### Phase 2: Skill-like 운영 레이어 추가
1. 프로젝트 내 `docs/codex-skills/`에 아래 문서 추가
   - `workflow-router.md`
   - `quality-gates.md`
   - `browser-smoke.md`
2. 각 문서에 "입력 조건 / 실행 명령 / 산출 포맷" 고정
3. 문서와 실제 npm scripts 이름 일치 보장

완료 기준:
- 라우팅 문서가 backend/frontend 템플릿이 아닌 `englishapp` 구조에 맞춤

### Phase 3: MCP 브라우저 검증 체계
1. `.codex/config.toml` 도입 여부 결정
   - 현재 사용 도구(Playwright MCP) 유지 vs chrome-devtools MCP 추가
2. 도입 시 기준:
   - 팀 표준 MCP 1개를 선택해 runbook에 고정
3. `browser-smoke` 절차 문서화
   - URL
   - snapshot/screenshot
   - console/network
   - 결과 요약 템플릿

완료 기준:
- "브라우저 검증 완료" 보고 시 증거 필드가 항상 포함됨

### Phase 4: 자동화 강화 (선택)
1. `scripts/codex/preflight` 성격 스크립트 추가
   - 변경 파일 기반으로 필요한 체크를 안내
2. `pre-push` 훅 추가
   - 무거운 검사(`codex:workflow:check`, 필요 시 e2e)를 push 전에 추가 강제

완료 기준:
- pre-commit은 빠르게, pre-push는 강하게 분리 운용

## 6) 체크리스트
- [ ] `AGENTS.md`에 최신 비협상 규칙 반영
- [ ] 품질/브라우저/라우팅 문서 추가
- [ ] 문서 명령과 `package.json` scripts 1:1 매핑 확인
- [ ] MCP 표준(Playwright vs chrome-devtools) 결정 및 문서 반영
- [ ] `npm run codex:workflow:check` 통과
- [ ] pre-commit 훅에서 동일 통과 확인
- [ ] (선택) pre-push 훅 도입 및 통과 확인

## 7) 리스크 및 대응
- 리스크: AHW 템플릿을 그대로 복붙하면 저장소 구조 불일치로 운영 혼선
  - 대응: 본 저장소 구조(`app/`, `server/`, `scripts/`) 기준으로 스킬/명령 재정의
- 리스크: AI 게이트 오탐
  - 대응: staged diff 기준 유지 + `P0/P1`만 차단
- 리스크: MCP 서버 혼용
  - 대응: 단일 표준 MCP를 명시하고 runbook에서 강제

## 8) 즉시 실행 권고안
1. `Phase 1` + `Phase 2`를 먼저 완료해 운영 문구를 고정한다.
2. 브라우저 MCP 표준을 정한 뒤 `Phase 3` 반영한다.
3. 팀이 원하면 마지막에 `Phase 4(pre-push)`를 추가해 차단 수준을 높인다.
