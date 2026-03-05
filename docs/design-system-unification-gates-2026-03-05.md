# 디자인 시스템 통합 게이트 기준

## Gate A — PHASE 1 (FOUNDATION)

### 입력
- 토큰 정의 초안
- 컴포넌트 스펙 초안
- 플랫폼 매핑 초안

### 필수 검증
1. color/type/spacing/radius/shadow/motion 토큰이 모두 정의되어 있다.
2. Button/Input/Card/Feedback에 variant/size/state 표가 있다.
3. 접근성 기준(대비, focus, touch target, form error labeling)이 문서에 포함되어 있다.
4. 웹(Tailwind/CSS), 모바일(RN theme) 매핑이 모두 정의되어 있다.
5. 임의 색상/간격 없이 구현 가능한지 자체 검증 문장이 포함되어 있다.

### 통과 선언 포맷
- `PHASE 1 GATE: PASS`
- 근거: 산출물 파일 3개 + 자체 검증 결과

## Gate B — PHASE 2 (IMPLEMENTATION)

### 입력
- 웹 2개 화면 적용 결과
- 모바일 2개 화면 적용 결과

### 필수 검증
1. 웹 대표 화면 2개(홈/워드북/가격 중) 적용 완료
2. 모바일 대표 화면 2개(로그인/홈/워드북 중) 적용 완료
3. Button/Input/Card/Feedback 공통 컴포넌트가 실제 화면에 적용됨
4. 1차 CTA 1개 중심으로 정보 구조가 단순화됨
5. 카피 톤(CTA/빈 상태/오류) 일관성이 확보됨
6. 적용 화면 기준 임의 색상/간격 하드코딩이 없음

### 통과 선언 포맷
- `PHASE 2 GATE: PASS`
- 근거: 변경 파일 목록 + 컴포넌트 적용률 + 토큰 위반 점검 결과

## Gate C — PHASE 3 (QA & HARDENING)

### 입력
- QA 점검 결과
- 실행한 검증 명령 결과

### 필수 검증
1. 디자인 일관성(color/type/spacing/state) PASS
2. 접근성/사용성(focus/contrast/touch target/form feedback) PASS
3. 성능/렌더링(과한 애니메이션, 불필요 리렌더) PASS
4. 발견 이슈의 원인/수정/재검증 기록 존재
5. 남은 리스크와 TODO Top 5가 문서화되어 있음

### 통과 선언 포맷
- `PHASE 3 GATE: PASS`
- 근거: QA 체크리스트 PASS/FAIL 근거 + 명령 실행 로그

## 실패 시 규칙
- 해당 게이트를 PASS하기 전 다음 단계로 이동하지 않는다.
- FAIL 항목은 progress 문서에 원인/수정/재검증 순서로 기록한다.
