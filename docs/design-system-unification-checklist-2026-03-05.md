# 디자인 시스템 통합 체크리스트

## PHASE 1 — FOUNDATION
- [x] 공통 토큰 파일 작성 완료 (`docs/design-system-unified-tokens-v1.json`)
- [x] 컴포넌트 스펙 문서 작성 완료 (`docs/design-system-component-spec-v1.md`)
- [x] 플랫폼 매핑 문서 작성 완료 (`docs/design-system-platform-mapping-v1.md`)
- [x] 접근성 기준(대비/포커스/터치 타깃/폼 오류 레이블) 명시
- [x] 토큰만으로 구현 가능 여부 자체 검증

## PHASE 2 — IMPLEMENTATION (WEB)
- [x] 대표 화면 2개 적용 완료 (홈, 가격)
- [x] 공통 컴포넌트 적용: Button
- [x] 공통 컴포넌트 적용: Input/Form
- [x] 공통 컴포넌트 적용: Card/Surface
- [x] 공통 컴포넌트 적용: Feedback
- [x] 1차 CTA 1개 중심 구조로 단순화
- [x] 보조 액션 정리(텍스트 링크/메뉴/접기)

## PHASE 2 — IMPLEMENTATION (MOBILE)
- [x] 대표 화면 2개 적용 완료 (로그인, 홈)
- [x] safe-area/스크롤/헤더/탭 정렬 확인
- [x] 공통 컴포넌트 적용: Button
- [x] 공통 컴포넌트 적용: Input/Form
- [x] 공통 컴포넌트 적용: Card/Surface
- [x] 공통 컴포넌트 적용: Feedback
- [x] 웹과 CTA/빈 상태/오류 카피 톤 일치

## PHASE 3 — QA & HARDENING
- [x] color/type/spacing/state 일관성 점검
- [x] focus/contrast/touch target/form feedback 점검
- [x] 과한 애니메이션 없음 확인
- [x] 불필요 리렌더 징후 없음 확인
- [x] 이슈 원인 기반 수정 완료

## 검증 명령
### 웹
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run build`
- [ ] `npm run codex:workflow:check` (기존 staged 백엔드 P1 리뷰 이슈로 FAIL)

### 모바일
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run build`

## 완료 기준
- [x] 토큰 위반 0건 (토큰 정의 파일 제외, 적용 화면 기준)
- [x] 단계별 게이트 통과 기록이 progress 문서에 남아 있음
