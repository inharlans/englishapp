# AI 운영체계 컨텍스트/의사결정 노트

작성일: 2026-02-22

## Status
- Phase: Foundation
- Progress: 4 / 18 tasks complete
- Last Updated: 2026-02-22

## Scope
- 프로젝트: `C:\dev\englishapp`
- 목표: 영상에서 제시한 실행방식을 englishapp의 일상 운영(기능개발, 점검루프, 오류복구)에 적용
- 비포함:
  - 결제 도메인 정책 변경
  - 기존 운영 규정의 일괄 폐기

## Key Files
**Existing Baseline**
- `C:\dev\englishapp\.claude\settings.json` - 훅 등록
- `C:\dev\englishapp\.claude\hooks\subagent-router.ps1` - 사용자 프롬프트 기반 에이전트 추천
- `C:\dev\englishapp\.claude\agents\planner.md` - 계획 문서 작성 에이전트
- `C:\dev\englishapp\.claude\agents\plan-reviewer.md` - 계획 사전 검토 에이전트
- `C:\dev\englishapp\.claude\agents\auto-error-resolver.md` - TS 오류 복구 에이전트
- `C:\dev\englishapp\scripts\auto-loop-runner.ps1` - 주기 루프 실행기
- `C:\dev\englishapp\scripts\mcp-cycle.js` - 사이클 워커(typecheck/lint)
- `C:\dev\englishapp\docs\REPEAT_AUDIT_LOOP_PROTOCOL.md` - 기존 반복 점검 프로토콜

**New Operating Docs**
- `C:\dev\englishapp\docs\ai-operating-system-2026-02-22\01-ai-operating-system-plan.md`
- `C:\dev\englishapp\docs\ai-operating-system-2026-02-22\03-ai-operating-system-tasks.md`
- `C:\dev\englishapp\docs\ai-operating-system-2026-02-22\04-ai-operating-system-review.md`

## Core Decisions
1. 계획 우선 원칙 채택 (2026-02-22)
- Rationale: 구현 선행 시 재작업률이 높고 맥락 이탈이 잦음.
- Alternatives: 즉시 구현 후 리뷰.
- Trade-offs: 초기 속도는 느려지나 총 리드타임/실패율 개선.

2. 3문서 기억 구조 채택 (2026-02-22)
- Rationale: Plan/Context/Tasks 분리로 세션 전환 시 복구 속도 향상.
- Alternatives: 단일 장문 문서.
- Trade-offs: 문서 수 증가, 대신 추적성과 갱신 책임이 명확해짐.

3. 자동검사는 완료 시점 중심으로 운영 (2026-02-22)
- Rationale: 작업 중간 검사 남발은 잡음이 많고 생산성 저하.
- Alternatives: 파일 수정 단위 즉시 검사.
- Trade-offs: 중간 오류 발견 지연 가능성, 대신 완료 단위 품질 안정.

4. 에이전트는 분업형 추천으로 시작 (2026-02-22)
- Rationale: 현재 훅은 추천형이므로 운영 리스크가 낮음.
- Alternatives: PreToolUse 강제 차단.
- Trade-offs: 강제력이 약하나 도입 저항이 낮고 안정적 전환 가능.

## Operating Model (v1)
1. UserPromptSubmit 단계:
- 훅이 프롬프트를 해석해 적합 에이전트를 추천
- 기본 매핑:
  - 기획/아키텍처/대형작업: `planner`
  - 계획 검토 요구/고위험 변경: `plan-reviewer`
  - TS 컴파일 오류: `auto-error-resolver`

2. Plan 단계:
- `planner`로 3문서 초안 생성
- 구현 금지, 계획만 확정

3. Review 단계:
- `plan-reviewer`로 show-stopper/누락 항목 점검
- 승인 전 위험 항목 수정

4. Execute 단계:
- 태스크를 1-2개씩 수행
- 각 완료 시 체크리스트 갱신

5. Validate 단계:
- `mcp-cycle` 또는 동등 명령으로 typecheck/lint 실행
- 실패 시 `auto-error-resolver` 우선 진입

6. Record 단계:
- 변경 요약, 실패/복구 기록, 다음 우선순위 업데이트

## KPI / SLO Draft
- Planning Compliance: 구현 작업 중 계획 문서 선행 비율 100%
- Review Gate Compliance: 위험 작업 중 리뷰 선행 비율 100%
- Validation Pass Rate: 완료 후 1회 통과율 80% 이상
- Rework Rate: 같은 결함 재발률 월별 감소 추세
- Context Recovery Time: 세션 재개 후 첫 생산성 작업까지 10분 이내

## Open Questions
- Q1: PreToolUse 차단형 가드(계획 없는 구현 차단)를 언제 도입할지
- Q2: 테스트 범위를 어디까지 자동검사 파이프라인에 포함할지
- Q3: 루프 실패 임계치(`MaxConsecutiveFailures`)를 도메인별로 분리할지

## Next Review Date
- 2026-03-02 (v1 운영 1주 후)
