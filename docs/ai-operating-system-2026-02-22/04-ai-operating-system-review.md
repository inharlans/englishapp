# AI 운영체계 계획 검토 보고서 (plan-reviewer 관점)

검토일: 2026-02-22  
검토 대상:
- `C:\dev\englishapp\docs\ai-operating-system-2026-02-22\01-ai-operating-system-plan.md`
- `C:\dev\englishapp\docs\ai-operating-system-2026-02-22\02-ai-operating-system-context.md`
- `C:\dev\englishapp\docs\ai-operating-system-2026-02-22\03-ai-operating-system-tasks.md`

## Executive Summary
- 계획의 방향성은 적절하며, 현재 프로젝트 자산(훅/에이전트/루프 스크립트)을 재사용하는 점이 현실적이다.
- 다만 운영체계를 실제로 굴릴 때 실패하는 지점은 대부분 `강제력 부족`, `검증 범위 미정`, `문서 갱신 누락`에서 발생한다.
- 따라서 v1은 추천형으로 시작하되, v1 종료 시점에 최소 1개의 강제 게이트를 추가하는 전제 조건이 필요하다.

## Critical Issues (Must Fix Before Full Rollout)
1. 강제 게이트 부재
- 문제: 현재 훅은 추천형이라 계획 승인 없이 구현이 계속 가능하다.
- 영향: 운영체계 도입 후에도 기존 즉흥 구현 습관이 유지될 수 있음.
- 조치: 최소한 대형 작업(예: major/refactor/migration 키워드)에는 `plan 존재 여부` 확인 게이트를 도입.

2. 자동검사 범위가 런타임 회귀를 충분히 막지 못함
- 문제: 기본 체크가 `typecheck + lint` 중심이며 기능 회귀 탐지가 약함.
- 영향: 컴파일은 통과하지만 UX/비즈니스 로직 회귀가 누수될 수 있음.
- 조치: 변경 영역 기반의 최소 테스트(스모크 또는 라우트 단위) 1개 이상을 DoD에 포함.

3. 문서-코드 동기화 규칙 미약
- 문제: Context/Tasks 문서 갱신이 권고 수준이라 누락 가능성이 높음.
- 영향: 세션 전환 시 복구 실패, 같은 분석 반복.
- 조치: 완료 보고 템플릿에 `수정 파일 + 근거 로그 + 다음 액션` 3필수 항목 강제.

## Missing Considerations
- 보안/민감정보:
  - 로그/문서에 사용자 식별정보, 결제 관련 민감값이 섞일 수 있으므로 마스킹 규칙 필요.
- 운영 정책 충돌:
  - 기존 `docs/REPEAT_AUDIT_LOOP_PROTOCOL.md`의 결제영역 제외 규칙과 새 운영체계의 범위 선언을 일치시켜야 함.
- 실패 처리 표준:
  - `auto-error-resolver` 실패 시 fallback 담당(사람/다른 에이전트)과 타임박스 기준이 필요.
- 측정 가능성:
  - KPI 정의는 있으나 계산 소스(어느 로그에서 뽑는지)가 아직 고정되지 않음.

## Alternative Approaches
1. 단계적 강제화 모델
- v1: 추천형 훅
- v2: 특정 키워드 작업에 PreToolUse soft-block
- v3: 계획 승인 체크 실패 시 hard-block

2. 이중 검증 모델
- 기계 검증(typecheck/lint/test) + 구조 검토(plan-reviewer) 모두 통과해야 완료 인정.

3. 태스크 크기 제한 모델
- L/XL 작업은 분할 계획 없이는 시작 불가로 운영해 맥락 이탈을 줄임.

## Implementation Recommendations
- R1. `완료 정의(DoD)`를 문서에 고정:
  - 계획 링크
  - 변경 파일 목록
  - 검증 결과
  - 리스크 메모
- R2. `작업 시작 템플릿` 고정:
  - planner 호출 -> plan-reviewer 호출 -> 승인 -> 구현
- R3. `실패 재진입 템플릿` 고정:
  - 실패 로그 첨부 -> auto-error-resolver -> 재검증 -> Context 갱신
- R4. 1주차 목표를 기능 확장보다 운영 안정화 지표 확보에 둠.

## Risk Mitigation Plan
- 리스크: 계획 없는 구현 진입
  - 대응: major 키워드 감지 시 경고를 2회 이상 받으면 soft-block 발동
- 리스크: 검증 비용 증가로 우회 행동
  - 대응: 최소 검사 세트를 빠르게 유지하고, 고비용 테스트는 조건부 실행
- 리스크: 문서 피로도
  - 대응: 문서 템플릿을 1페이지 내로 제한하고 자동 요약 구문을 재사용

## Research Findings (Project-Scoped)
- `scripts/mcp-cycle.js`는 이미 사이클 워커(상태 파일 기록 포함)를 제공하므로 품질검사 자동화 기반이 충분하다.
- `scripts/auto-loop-runner.ps1`는 실패 임계치/타임아웃 제어가 있어 장기 루프 운용에 바로 활용 가능하다.
- `.claude/agents`와 `.claude/hooks`는 이미 배치되어 있어 “시스템 설계”보다는 “운영 규칙 고정”이 현재 우선순위다.

## Approval Recommendation
- 조건부 승인(Approved with Conditions)
- 조건:
  1. 강제 게이트 1개(soft-block 이상) 도입 계획을 Phase 2 종료 전에 명시
  2. 검증 DoD에 변경영역 테스트 최소 1개 포함
  3. 완료 보고 템플릿 3필수 항목 강제
