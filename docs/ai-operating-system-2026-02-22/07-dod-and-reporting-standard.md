# DoD 및 완료보고 표준 (v1)

작성일: 2026-02-22

## Done Definition (필수)
모든 구현/수정 작업은 아래를 만족해야 `완료`로 인정한다.

1. 계획 승인
- `planner`와 `plan-reviewer` 결과를 반영한 승인 상태여야 한다.

2. 변경영역 테스트 1개 이상
- 최소 1개 이상의 변경영역 검증을 실행한다.
- 예시:
  - 타입 안정성: `npm run typecheck`
  - 정적 규칙: `npm run lint`
  - 라우트/기능 단위 테스트: 변경 영역에 맞는 테스트 1개 이상

3. 자동검사 통과
- `typecheck`와 `lint` 결과를 기록한다.

4. 완료보고 3필수
- 아래 3항목이 없으면 완료로 인정하지 않는다.
  - 수정 파일 목록
  - 검증 명령 + 결과
  - 다음 액션(후속 위험/우선순위)

## 완료보고 템플릿
```md
## Completion Report
- Task: [task id / name]
- Scope: [what changed]

### 1) Modified Files
- `path/to/file1`
- `path/to/file2`

### 2) Verification
- `npm run typecheck` -> pass/fail
- `npm run lint` -> pass/fail
- [changed-area test command] -> pass/fail

### 3) Next Action
- [highest-priority next step]
- [known risk or follow-up]
```

## 자동 생성 명령
- 기본:
  - `npm run mcp:cycle`
  - `npm run completion:report -- --task "task-name" --scope "what changed"`
- 출력 위치:
  - `docs/ai-operating-system-2026-02-22/reports/`

## 운영 규칙
- 빠른 핫픽스라도 완료보고 3필수는 생략하지 않는다.
- 실패 시 `failed report`를 먼저 남기고 수정 루프를 진행한다.
