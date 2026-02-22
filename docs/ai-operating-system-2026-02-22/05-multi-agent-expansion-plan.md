# 멀티 에이전트 확장 운영 계획서 (추가)

작성일: 2026-02-22  
기준: 기존 3개(`planner`, `plan-reviewer`, `auto-error-resolver`) + 나머지 에이전트 전부 반영

## 목표
- 기존 운영체계를 “계획/검토/오류복구” 중심에서, `설계검토/리팩터링/문서화/프론트 런타임 디버깅/인증 라우트 테스트/외부 리서치`까지 확장한다.
- 에이전트별 책임 경계를 명확히 해 중복 지시와 재작업을 줄인다.

## 확장 대상 에이전트
- `code-architecture-reviewer`
- `code-refactor-master`
- `documentation-architect`
- `frontend-error-fixer`
- `refactor-planner`
- `web-research-specialist`
- `auth-route-debugger`
- `auth-route-tester`

## 에이전트 역할 매트릭스
1. 설계/품질
- `code-architecture-reviewer`: 구현 후 아키텍처/패턴 적합성 리뷰
- `documentation-architect`: 변경 결과를 개발 문서/운영 문서로 고정

2. 리팩터링
- `refactor-planner`: 리팩터링 사전 분석/단계 계획
- `code-refactor-master`: 승인된 리팩터링 실행 및 의존성 정리

3. 오류 대응
- `frontend-error-fixer`: 브라우저 런타임/프론트 빌드 오류 대응
- `auto-error-resolver`: TypeScript 컴파일 오류 자동 수습

4. API/인증
- `auth-route-debugger`: 인증/라우팅 실패(401/403/404) 원인 진단
- `auth-route-tester`: 인증 라우트 기능 검증 및 DB 반영 확인

5. 외부 지식 보강
- `web-research-specialist`: 불명확 이슈/라이브러리 회귀 시 외부 근거 수집

## 실행 시나리오별 표준 체인
1. 신규 기능(일반)
- `planner` -> `plan-reviewer` -> 구현 -> `code-architecture-reviewer` -> `documentation-architect`

2. 리팩터링 작업
- `refactor-planner` -> `plan-reviewer` -> `code-refactor-master` -> `auto-error-resolver` -> `code-architecture-reviewer`

3. 프론트 장애
- `frontend-error-fixer` -> `auto-error-resolver`(타입 에러 동반 시) -> `documentation-architect`

4. 인증/API 장애
- `auth-route-debugger` -> `auth-route-tester` -> `code-architecture-reviewer` -> `documentation-architect`

5. 원인 불명/신규 이슈
- `web-research-specialist` -> (결과 기반) `planner` 또는 전문 에이전트 체인 진입

## 도입 단계
### Phase 1 (즉시, 1-2일)
- 에이전트 호출 템플릿을 작업 유형별로 문서화
- 현재 훅 추천 기준에 `refactor`, `runtime error`, `auth route`, `research` 키워드 추가 설계

### Phase 2 (3-4일)
- 각 시나리오별 “완료 정의(DoD)” 고정
- `docs/`에 에이전트 실행 리포트 저장 경로 통일

### Phase 3 (1주)
- 실패/재작업 데이터 기반으로 체인 최적화
- 저효율 체인(왕복 많은 체인) 축소

## 파일 경로 표준
- 계획/운영: `docs/ai-operating-system-2026-02-22/`
- 이슈별 실행 리포트: `docs/service-audit-YYYY-MM-DD-loop/` 또는 기능별 폴더
- 에이전트 정의: `C:\dev\englishapp\.claude\agents\`

## 리스크 및 대응
1. 에이전트 설명의 프로젝트 불일치
- 예: auth 에이전트 설명이 Keycloak/JWT cookie 예시 중심
- 대응: englishapp 실제 인증 플로우 기준으로 호출 프롬프트에서 제약 명시

2. 과도한 에이전트 체인으로 속도 저하
- 대응: 작업 유형별 기본 체인을 3-5단계로 제한

3. 문서 산출물 누적만 되고 활용 부족
- 대응: 완료 보고 시 “다음 작업 입력값” 필수화(재사용 가능 형태)

## 성공 지표
- 이슈 분류 후 첫 대응 에이전트 선택 정확도 85% 이상
- 동일 이슈 재발 시 평균 해결 시간 30% 단축
- 운영 문서 누락률 10% 이하
