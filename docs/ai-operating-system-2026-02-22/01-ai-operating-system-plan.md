# AI 운영체계 구축 전략 계획서 (englishapp)

작성일: 2026-02-22

## Executive Summary
- 목표는 AI를 단발성 프롬프트 도구가 아니라, `계획 -> 검토 -> 실행 -> 자동검증 -> 재수정`으로 순환하는 운영체계로 전환하는 것이다.
- 기준 모델은 영상에서 제시한 4요소(자동 매뉴얼, 작업 기억, 자동 품질검사, 전문 에이전트 분업)이며, englishapp 현재 자산(`.claude/agents`, `scripts/`, `docs/`) 위에 바로 얹는다.
- 2주 내 최소 운영 버전(MVP)을 만들고, 그 다음 2주 동안 실패율/재작업률/사이클 타임을 줄이는 안정화 단계로 확장한다.

## Current State
- 강점:
  - 프로젝트에 반복 점검 루프 자산이 이미 존재함: `scripts/auto-loop-runner.ps1`, `scripts/mcp-cycle.js`, `docs/REPEAT_AUDIT_LOOP_PROTOCOL.md`.
  - 서브에이전트가 준비됨: `C:\dev\englishapp\.claude\agents\planner.md`, `C:\dev\englishapp\.claude\agents\plan-reviewer.md`, `C:\dev\englishapp\.claude\agents\auto-error-resolver.md`.
  - 훅 기본 배선이 존재함: `C:\dev\englishapp\.claude\settings.json`, `C:\dev\englishapp\.claude\hooks\subagent-router.ps1`.
- 한계:
  - 계획/검토/실행/검증 산출물 포맷이 통일되지 않아 세션이 바뀌면 맥락 유실 위험이 있음.
  - 품질검증 결과와 수정 파일 추적이 분산되어 있으며, 실패 시 재진입 규칙이 문서/스크립트 단위로 분리되어 있음.
  - 에이전트 호출 기준(언제 planner 강제, 언제 review 강제)이 운영 규칙으로 고정돼 있지 않음.

## Proposed Solution
- 운영체계를 4개 레이어로 분리한다.
  - 레이어 A: 자동 매뉴얼/라우팅 (UserPromptSubmit 훅)
  - 레이어 B: 작업 기억 (Plan/Context/Tasks 3문서)
  - 레이어 C: 자동 품질검사 (완료 후 typecheck/lint + 실패 피드백 루프)
  - 레이어 D: 전문 에이전트 분업 (planner, plan-reviewer, auto-error-resolver)
- 핵심 원칙:
  - 구현 전에 반드시 계획 승인.
  - 큰 작업은 1-2개 태스크씩 쪼개 실행.
  - 완료 직후 자동검사 실패 시 같은 사이클에서 우선 복구.
  - 모든 결과는 문서와 로그로 남겨 재현 가능 상태 유지.

## Implementation Phases
### Phase 1: Foundation (2일)
**Goal**: 운영체계 표준 문서/규칙의 기반 확정

- [ ] 운영 루트/명명 규칙 정의 - File: `docs/ai-operating-system-2026-02-22/` - Size: S
- [ ] 표준 문서 3종 템플릿 확정(Plan/Context/Tasks) - File: `docs/ai-operating-system-2026-02-22/02-ai-operating-system-context.md` - Size: M
- [ ] 에이전트 호출 정책 정리 - File: `docs/ai-operating-system-2026-02-22/03-ai-operating-system-tasks.md` - Size: M
- [ ] 훅 동작 기준(추천/강제 아님)을 명시 - File: `C:\dev\englishapp\.claude\hooks\subagent-router.ps1` - Size: S

### Phase 2: Workflow Integration (3일)
**Goal**: 계획-검토-실행 루프를 실제 작업 절차로 연결

- [ ] 작업 시작 프로토콜 정의 (planner -> plan-reviewer -> 구현) - File: `docs/ai-operating-system-2026-02-22/03-ai-operating-system-tasks.md` - Size: M
- [ ] 세션 재개 프로토콜 정의 (Context 우선 로드) - File: `docs/ai-operating-system-2026-02-22/02-ai-operating-system-context.md` - Size: M
- [ ] 태스크 단위 완료 정의(DoD) 표준화 - File: `docs/ai-operating-system-2026-02-22/03-ai-operating-system-tasks.md` - Size: M
- [ ] 운영 보고 포맷 표준화 - File: `docs/ai-operating-system-2026-02-22/04-ai-operating-system-review.md` - Size: S

### Phase 3: Quality Automation (3일)
**Goal**: 완료 후 자동검증 및 실패 복구 루프 정착

- [ ] 품질검사 파이프라인 명세 정리(typecheck, lint, 선택 테스트) - File: `scripts/mcp-cycle.js` - Size: M
- [ ] 에러 자동 복구 흐름 정리(auto-error-resolver 진입 조건) - File: `C:\dev\englishapp\.claude\agents\auto-error-resolver.md` - Size: M
- [ ] 실패 임계치 및 중단 기준 통합 - File: `docs/REPEAT_AUDIT_LOOP_PROTOCOL.md` - Size: M
- [ ] 루프 로그 스냅샷 저장 규칙 확정 - File: `.loop/last-cycle.json` - Size: S

### Phase 4: Scale & Governance (2일)
**Goal**: 운영체계를 팀/장기 작업에도 유지 가능하게 고도화

- [ ] 전문 에이전트 확장 기준 수립(리뷰/테스트/문서화 역할 분리) - File: `C:\dev\englishapp\.claude\agents\README.md` - Size: M
- [ ] KPI 측정 항목 정의(재작업률, 오류 누수율, 사이클 타임) - File: `docs/ai-operating-system-2026-02-22/02-ai-operating-system-context.md` - Size: M
- [ ] 월간 회고 템플릿 정의 - File: `docs/ai-operating-system-2026-02-22/03-ai-operating-system-tasks.md` - Size: S

## Risk Assessment
- High Risk: 훅 추천만 믿고 계획 승인 없이 구현으로 직행
  - Mitigation: 태스크 정의에 `계획 승인 체크`를 완료 조건으로 포함
- High Risk: 자동검사 범위가 좁아 런타임 이슈 누수
  - Mitigation: typecheck/lint 외에 변경범위 테스트를 단계적으로 추가
- Medium Risk: 문서 갱신 누락으로 세션 재개 실패
  - Mitigation: 완료 직후 Context/Tasks 동시 갱신을 체크리스트에 강제

## Success Metrics
- 계획 승인 없이 구현 시작된 작업 비율: 0%
- PR/세션당 TypeScript 컴파일 오류 누수: 0건
- 동일 이슈 재수정(48시간 내) 비율: 30% 이상 감소
- 작업 재개 시 맥락 복구 시간: 평균 10분 이내

## Dependencies
- Code:
  - `C:\dev\englishapp\.claude\settings.json`
  - `C:\dev\englishapp\.claude\hooks\subagent-router.ps1`
  - `C:\dev\englishapp\.claude\agents\*.md`
  - `C:\dev\englishapp\scripts\auto-loop-runner.ps1`
  - `C:\dev\englishapp\scripts\mcp-cycle.js`
- Process:
  - 기존 반복 점검 규칙(`docs/REPEAT_AUDIT_LOOP_PROTOCOL.md`)과 충돌 없이 병합 필요

## Timeline
- Phase 1-2: 2026-02-22 ~ 2026-02-25
- Phase 3: 2026-02-26 ~ 2026-02-28
- Phase 4: 2026-03-01 ~ 2026-03-02
- Total: 10일, 4단계
