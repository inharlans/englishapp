# AGENTS Navigation Patch 3 Plan (2026-03-01)

Back to [AGENTS.md](../AGENTS.md)

## 목적
- 정책 의미 변경 없이 문서 네비게이션 속도와 회귀성을 높인다.
- 에이전트가 `AGENTS.md`를 시작점으로 하위 문서를 빠르게 탐색하도록 최적화한다.

## 범위
- `AGENTS.md` 링크화 (Patch 3-A)
- `AGENTS.md` 상황별 라우팅 표 추가 (Patch 3-B)
- 핵심 하위 문서 상단 `Back to AGENTS.md` 추가 (Patch 3-C)
- 링크 정합성 점검 및 검증 실행 (Patch 3-D)

## 비범위
- 정책 의미 변경
- 명령/가드레일 추가 또는 완화
- 앱 로직/화면/API 변경

## 실행 체크리스트

### Patch 3-A: AGENTS 링크화
- [x] fallback 문서 경로를 링크로 전환
- [x] local market 참조 문서 경로를 링크로 전환
- [x] start/finish template 참조 경로를 링크로 전환
- [x] 상세 문서 경로를 링크로 전환

### Patch 3-B: Quick Routing Map
- [x] `AGENTS.md` 하단에 `Quick Routing Map` 섹션 추가
- [x] 상황별 문서 라우팅 항목(범위 모호/리팩터링/market/MCP/hook) 추가
- [x] 링크 규칙(repo-relative 우선) 안내 1줄 추가

### Patch 3-C: Back-link 1줄 추가
- [x] `docs/refactor-execution-playbook-2026-03-01.md`
- [x] `docs/local-debug-wordbook-market.md`
- [x] `docs/mcp-access-policy-2026-02-28.md`
- [x] `docs/mcp-runbook.md`
- [x] `docs/ai-operating-system-2026-02-22/39-codex-workflow-start-template.md`

### Patch 3-D: 정합성 및 검증
- [x] 변경 파일 링크 경로 수동 점검
- [x] `npm run codex:workflow:check` 실행
- [x] 결과 요약 보고 작성

## 완료 기준
- 정책 의미 변경 0건
- 핵심 라우팅 링크 클릭 경로 동작
- `npm run codex:workflow:check` 실행 완료(성공 종료)

## 실행 결과 요약
- Patch 3-A/B/C 문서 변경 완료
- 핵심 링크 경로 수동 점검 완료(AGENTS -> 하위 문서, 하위 문서 -> AGENTS)
- 검증 명령 실행: `npm run codex:workflow:check`
  - 결과: `codex-workflow-guard: PASS`
  - 비고: `compact:check`, `hooks:validate`, `ai:review:gate` 모두 통과
