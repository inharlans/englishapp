# 디자인 시스템 통합 실행 계획 (웹+모바일)

## 목적
- 웹(`C:\dev\englishapp`)과 모바일(`C:\dev\englishapp-mobile`)이 플랫폼 네이티브 UX를 유지하면서도 하나의 제품처럼 보이도록 시각 언어를 통합한다.
- 학습 앱 특성상 화려함보다 집중도, 가독성, 인지 부담 최소화를 우선한다.

## 디자인 원칙
- 단순하고 깔끔한 UI: 화면당 1차 행동 1개를 우선 노출한다.
- 버튼 수 최소화: 보조 액션은 링크/메뉴/접기 형태로 정리한다.
- 산만함 방지: 주색 1개, 보조 1개, 상태색 소수만 유지한다.
- 직관성: 3초 내 다음 행동이 보이도록 정보 계층을 단순화한다.
- 일관성: 동일 의미에 동일 토큰/카피 톤을 적용한다.

## 3단계 게이트 방식

### PHASE 1 — FOUNDATION
- 공통 토큰 정의: color/type/spacing/radius/shadow/motion
- 컴포넌트 스펙 정의: Button/Input/Card/Feedback의 variant/size/state
- 접근성 기준 정의: contrast, focus visibility, touch target, form error labeling
- 플랫폼 매핑 정의: Tailwind 토큰 매핑, RN theme 토큰 매핑

#### 산출물
1. `docs/design-system-unified-tokens-v1.json`
2. `docs/design-system-component-spec-v1.md`
3. `docs/design-system-platform-mapping-v1.md`

#### 통과 조건
- 토큰만으로 컴포넌트 구현 가능해야 한다.
- 임의 색상/간격 하드코딩 없이 구현 가능해야 한다.

### PHASE 2 — IMPLEMENTATION
- 웹: 홈/가격 화면에 공통 컴포넌트와 토큰 적용
- 모바일: 로그인/홈 화면에 공통 컴포넌트와 토큰 적용
- 카피 톤 정렬: CTA/빈 상태/오류 문구 톤 통일

#### 통과 조건
- 적용 화면에서 임의 색/간격 위반이 없어야 한다.
- 1차 CTA 1개 중심 구조를 유지해야 한다.

### PHASE 3 — QA & HARDENING
- 디자인 일관성 점검(color/type/spacing/state)
- 접근성/사용성 점검(focus/contrast/touch target/form feedback)
- 성능/렌더링 점검(과한 애니메이션/불필요 리렌더)
- 이슈는 원인 기반으로 수정하고 재검증

#### 통과 조건
- QA 체크리스트에서 핵심 항목 PASS
- 남은 리스크와 후속 TODO 우선순위가 문서화되어야 함

## 스킬 적용 가이드
- 공통: `frontend-design`
- 웹 구현: `vercel-react-best-practices`
- 웹 QA: `web-design-guidelines`
- 모바일 구현: `vercel-react-native-skills`, `building-native-ui`, `react-native-best-practices`
- 이슈 발생 시: `systematic-debugging`

## 실행 순서
1. PHASE 1 산출물 작성 및 자체 검증
2. PHASE 2 웹 적용 후 자체 토큰 위반 점검
3. PHASE 2 모바일 적용 후 자체 토큰 위반 점검
4. PHASE 3 QA와 검증 명령 실행
5. 진행 상황을 `docs/design-system-unification-progress-2026-03-05.md`에 기록
