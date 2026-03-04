# 스킬 정리 및 라우팅 매핑 실행 계획서 (2026-03-04)

## 목적
- 현재 프로젝트에서 실제로 사용하는 스킬만 남기고, 구식/미존재 매핑을 제거한다.
- `.claude/hooks/skill-activation-prompt.mjs`와 `.claude/skills/skill-rules.json`을 동일한 기준으로 맞춘다.
- 작업 요청별로 어떤 스킬을 자동 추천할지 운영 가능한 형태로 표준화한다.

## 범위
- 포함:
  - `.claude/skills/skill-rules.json` 재설계
  - `skill-activation-prompt.mjs` 출력 경로/기본 fallback 정리
  - 사용/비사용 스킬 분류 및 문서화
- 제외:
  - 스킬 본문 대규모 리라이트
  - 신규 스킬 폴더 추가
  - 기존 스킬 파일 물리 삭제

## 현재 진단 요약
- 문제 1: `skill-rules.json`에 실제 파일이 없는 구 에이전트 키가 다수 존재.
- 문제 2: Hook 출력이 `.claude/agents/*.md` 경로를 가리켜 현재 스킬 구조와 불일치.
- 문제 3: 프로젝트 주 스택(Next.js/TypeScript) 대비 FastAPI/pytest 스킬의 기본 우선순위가 높음.

## 최종 스킬 정책

### 채택 (기본 활성)
- `workflow-router`
- `nextjs-frontend-guidelines`
- `error-tracking`
- `skill-developer`
- `brand-guidelines` (브랜딩 요청 시 우선)

### 저빈도 유지
- `fastapi-backend-guidelines`
- `pytest-backend-testing`

## 실제 매핑 원칙
- 규칙 파일에서 추천 대상을 스킬 실재 여부와 1:1로 맞춘다.
- 추천 출력은 다음 순서로 경로를 탐색한다.
  - 1) `.claude/skills/{name}/SKILL.md`
  - 2) `.agents/skills/{name}/SKILL.md`
- 규칙에서 매칭 실패 시 fallback은 다음 우선순위를 사용한다.
  - `error-tracking` -> `fastapi-backend-guidelines` -> `pytest-backend-testing` -> `nextjs-frontend-guidelines` -> `workflow-router`

## 실행 체크리스트

### Phase 1. 규칙/매핑 정리
- [x] 기존 `skill-rules.json`의 구 에이전트 키 제거
- [x] 유지 대상 스킬 중심으로 `version 2.0` 매핑 구성
- [x] 저빈도 백엔드 스킬은 유지하되 트리거를 제한적으로 구성

### Phase 2. Hook 정합성 수정
- [x] 추천 출력 라벨을 agents -> skills로 변경
- [x] 추천 경로를 실제 스킬 파일 경로로 변경
- [x] 기본 fallback 로직을 현재 스택 중심으로 재설계
- [x] `intentPatterns` 정규식 매칭 지원 추가

### Phase 3. 검증
- [x] `node .claude/hooks/skill-activation-prompt.mjs` 스모크 테스트 (프론트/에러/일반)
- [x] `npm run codex:workflow:check` 실행

### Phase 4. 운영 반영
- [ ] 필요 시 `workflow-router` 트리거 키워드 추가 미세조정
- [ ] 1주 운영 후 오탐/누락 케이스 반영

## 롤백 계획
- `skill-rules.json`/`skill-activation-prompt.mjs` 두 파일만 변경되므로 단일 커밋 롤백으로 복구 가능.
- 실패 시 우선 Hook fallback을 `workflow-router` 단일 추천으로 축소해 안전 모드로 운영한다.

## 완료 기준 (Definition of Done)
- Hook 추천 결과가 실재 경로를 출력한다.
- 비활성 스킬은 자동 추천에서 제외된다.
- 저빈도 백엔드 스킬은 FastAPI/pytest 문맥에서만 추천된다.
- 프론트 작업 요청 시 `nextjs-frontend-guidelines`가 우선 추천된다.
- 에러/모니터링 요청 시 `error-tracking`이 우선 추천된다.
