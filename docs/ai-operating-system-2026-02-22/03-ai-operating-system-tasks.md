# AI 운영체계 실행 체크리스트

작성일: 2026-02-22

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Complete
- [!] Blocked
- [-] Skipped

## Progress Summary
7 / 20 tasks complete (35%)

## Phase 1: Foundation
- [x] 서브에이전트 파일 설치 확인
  - File: `C:\dev\englishapp\.claude\agents\planner.md`
  - Acceptance: planner 파일 존재 확인
  - Size: S
  - Dependencies: 없음

- [x] 훅 라우터 연결
  - File: `C:\dev\englishapp\.claude\settings.json`
  - Acceptance: UserPromptSubmit에 라우터 명령 등록
  - Size: S
  - Dependencies: 없음

- [x] 라우터 스크립트 배치
  - File: `C:\dev\englishapp\.claude\hooks\subagent-router.ps1`
  - Acceptance: 프롬프트 키워드별 에이전트 추천 출력 확인
  - Size: S
  - Dependencies: 없음

- [x] 운영 문서 루트 생성
  - File: `C:\dev\englishapp\docs\ai-operating-system-2026-02-22\`
  - Acceptance: plan/context/tasks/review 문서 생성
  - Size: S
  - Dependencies: 없음

## Phase 2: Plan/Review Workflow
- [ ] 신규 작업 시작 표준 프롬프트 정의
  - File: `C:\dev\englishapp\docs\ai-operating-system-2026-02-22\02-ai-operating-system-context.md`
  - Details: planner 시작 프롬프트, plan-reviewer 검토 프롬프트 템플릿 문서화
  - Acceptance: 템플릿 2종 완성
  - Size: M
  - Dependencies: Phase 1 완료

- [ ] 작업 단위 분할 규칙 정의
  - File: `C:\dev\englishapp\docs\ai-operating-system-2026-02-22\01-ai-operating-system-plan.md`
  - Details: 1-2개 태스크 단위 실행 원칙, 크기 기준(S/M/L/XL) 명시
  - Acceptance: 모든 신규 계획서에 사이즈 표기 적용
  - Size: M
  - Dependencies: Phase 1 완료

- [ ] 계획 승인 게이트 정의
  - File: `C:\dev\englishapp\docs\ai-operating-system-2026-02-22\04-ai-operating-system-review.md`
  - Details: 구현 착수 전 승인 체크 항목 확정
  - Acceptance: 체크 항목 6개 이상
  - Size: M
  - Dependencies: plan-reviewer 기준 정리

- [ ] 세션 재개 체크리스트 정의
  - File: `C:\dev\englishapp\docs\ai-operating-system-2026-02-22\02-ai-operating-system-context.md`
  - Details: 컨텍스트 재로딩 순서와 금지사항 기록
  - Acceptance: 새 세션 10분 내 재개 가능
  - Size: S
  - Dependencies: 없음

## Phase 3: Quality Automation
- [x] soft-block plan gate 도입 (PreToolUse)
  - File: `C:\dev\englishapp\.claude\hooks\plan-gate-pretool.ps1`
  - Details: major-task 세션에서 계획 승인 전 코드 경로 편집 차단
  - Acceptance: 차단(exit 2) 및 승인 후 해제(exit 0) 확인
  - Size: M
  - Dependencies: `plan-gate-prompt.ps1`

- [x] major-task 감지/승인 상태 훅 도입 (UserPromptSubmit)
  - File: `C:\dev\englishapp\.claude\hooks\plan-gate-prompt.ps1`
  - Details: 대형 작업 감지 시 계획 필요 상태 기록, `plan approved`로 해제
  - Acceptance: state 파일 생성/갱신 확인
  - Size: M
  - Dependencies: 없음

- [ ] 완료 후 검증 명령 표준화
  - File: `C:\dev\englishapp\scripts\mcp-cycle.js`
  - Details: 최소 `typecheck + lint`, 필요시 변경범위 테스트 확장
  - Acceptance: 문서에 표준 명령 반영
  - Size: M
  - Dependencies: 없음

- [ ] 에러 복구 진입 규칙 정의
  - File: `C:\dev\englishapp\.claude\agents\auto-error-resolver.md`
  - Details: 어떤 오류를 auto-error-resolver로 넘길지 명확화
  - Acceptance: TS 오류 대응 일관성 확보
  - Size: M
  - Dependencies: 검증 명령 표준화

- [ ] 루프 실패 임계치 조정
  - File: `C:\dev\englishapp\scripts\auto-loop-runner.ps1`
  - Details: `MaxConsecutiveFailures`, `TimeoutMinutes` 운영값 조정
  - Acceptance: 실패 폭주 시 자동 중단 동작 검증
  - Size: M
  - Dependencies: 과거 실패 로그 분석

- [ ] 실패 리포트 포맷 통일
  - File: `C:\dev\englishapp\docs\REPEAT_AUDIT_LOOP_PROTOCOL.md`
  - Details: 실패 원인/복구/재발방지 3항목 필수화
  - Acceptance: 다음 루프 문서부터 포맷 적용
  - Size: S
  - Dependencies: 없음

## Phase 4: Governance
- [ ] 전문 에이전트 역할 매트릭스 작성
  - File: `C:\dev\englishapp\.claude\agents\README.md`
  - Details: planner/reviewer/resolver 책임과 hand-off 정의
  - Acceptance: 역할 중복/누락 제거
  - Size: M
  - Dependencies: Phase 2 완료

- [ ] 운영 KPI 대시보드 초안 정의
  - File: `C:\dev\englishapp\docs\ai-operating-system-2026-02-22\02-ai-operating-system-context.md`
  - Details: 계획 준수율/검증 통과율/재작업률 집계식 정의
  - Acceptance: 월별 추세 수집 가능
  - Size: M
  - Dependencies: 로그 저장 규칙 확정

- [ ] 주간 회고 루틴 설계
  - File: `C:\dev\englishapp\docs\ai-operating-system-2026-02-22\04-ai-operating-system-review.md`
  - Details: 실패 top3, 개선 실험, 폐기 규칙
  - Acceptance: 회고 템플릿 적용 가능
  - Size: S
  - Dependencies: KPI 초안

## Deployment Checklist
- [ ] 훅 동작 확인
- [ ] 에이전트 경로 존재 확인
- [ ] 문서 템플릿 최신화
- [ ] 검증 명령 성공
- [ ] 실패 시 복구 경로 검증
- [ ] 운영 회고 일정 등록
- [x] DoD 및 완료보고 표준 문서화 (`07-dod-and-reporting-standard.md`)

## Notes
- 현재 버전은 추천형 + soft-block 가드(v1.1)다. hard-block은 안정화 후(v2) 검토한다.
- 결제 영역(`app/pricing`, `app/api/payments/*`)은 기존 프로토콜상 우선 보수적으로 다룬다.
