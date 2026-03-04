# 현재 스킬 카탈로그 (2026-03-04)

## 이 문서의 목적
- 팀원이 "어떤 말을 하면 어떤 스킬이 켜지는지"를 빠르게 이해할 수 있도록 정리한다.
- 현재 활성/비활성 상태를 명확히 구분한다.

## 사용 방법 (한 줄 요약)
- 프론트/기능 작업 요청 -> `nextjs-frontend-guidelines`
- 장애/예외/모니터링 요청 -> `error-tracking`
- 스킬/훅/규칙 작업 요청 -> `skill-developer`
- 브랜딩/로고/스타일 요청 -> `brand-guidelines`
- 애매하면 -> `workflow-router`

## 활성 스킬

### 1) workflow-router
- 파일: `.agents/skills/workflow-router/SKILL.md`
- 역할: 요청을 분석해서 어떤 스킬을 먼저 써야 하는지 라우팅.
- 이렇게 말하면 잘 켜짐:
  - "스킬 라우팅", "guardrail", "routing"
  - "작업 범위 분류해줘"

### 2) nextjs-frontend-guidelines
- 파일: `.claude/skills/nextjs-frontend-guidelines/SKILL.md`
- 역할: Next.js/React 프론트 구현 표준 가이드.
- 이렇게 말하면 잘 켜짐:
  - "next.js", "react", "app router", "컴포넌트", "페이지", "레이아웃"
  - "market", "wordbook", "clipper", "마켓", "워드북", "클리퍼"
  - "카카오 로그인 페이지", "익스텐션 UI"

### 3) error-tracking
- 파일: `.claude/skills/error-tracking/SKILL.md`
- 역할: Sentry 기반 에러 추적/모니터링/트레이싱 적용.
- 이렇게 말하면 잘 켜짐:
  - "sentry", "error tracking", "captureException", "monitoring"
  - "장애", "오류", "버그", "예외 처리", "로그 수집", "트레이싱"

### 4) skill-developer
- 파일: `.claude/skills/skill-developer/SKILL.md`
- 역할: 스킬 규칙/훅/트리거 설계와 유지보수.
- 이렇게 말하면 잘 켜짐:
  - "skill-rules", "hook", "trigger", "activation"
  - "스킬", "훅", "트리거", "라우팅 규칙", "codex workflow"

### 5) brand-guidelines
- 파일: `.claude/skills/brand-guidelines/SKILL.md`
- 역할: 브랜드 컬러/타이포 등 시각 가이드 적용.
- 이렇게 말하면 잘 켜짐:
  - "brand", "branding", "logo", "visual identity"
  - "브랜드", "브랜딩", "로고", "브랜드 컬러", "디자인 가이드"

### 6) fastapi-backend-guidelines
- 파일: `.claude/skills/fastapi-backend-guidelines/SKILL.md`
- 역할: FastAPI/Pydantic/Repository 계층형 백엔드 가이드.
- 이렇게 말하면 잘 켜짐:
  - "fastapi", "pydantic", "sqlmodel", "backend api", "endpoint", "repository"

### 7) pytest-backend-testing
- 파일: `.claude/skills/pytest-backend-testing/SKILL.md`
- 역할: pytest 기반 백엔드 테스트 작성/디버깅 가이드.
- 이렇게 말하면 잘 켜짐:
  - "pytest", "fixture", "mock", "coverage", "integration test", "unit test"

## 사용 빈도 낮은 스킬 (유지)

### fastapi-backend-guidelines
- 파일: `.claude/skills/fastapi-backend-guidelines/SKILL.md`
- 상태: 유지(저빈도)
- 이유: 현재 레포 주력은 프론트지만, 백엔드 관련 요청 대응을 위해 트리거는 유지.

### pytest-backend-testing
- 파일: `.claude/skills/pytest-backend-testing/SKILL.md`
- 상태: 유지(저빈도)
- 이유: 백엔드 테스트 요청 시에만 추천.

## fallback 규칙
- 어떤 스킬도 명확히 매칭되지 않으면:
  - 에러/모니터링 문맥이면 `error-tracking`
  - FastAPI/백엔드 API 문맥이면 `fastapi-backend-guidelines`
  - pytest/백엔드 테스트 문맥이면 `pytest-backend-testing`
  - 프론트 문맥이면 `nextjs-frontend-guidelines`
  - 그 외는 `workflow-router` (비활성화되어 있으면 추천 생략)

## 운영 메모
- 규칙 파일: `.claude/skills/skill-rules.json`
- 추천 훅: `.claude/hooks/skill-activation-prompt.mjs`
- 팀 용어가 바뀌면 위 두 파일의 키워드를 같이 갱신한다.
