# PHASE 3 QA & HARDENING 리포트

## 1) 디자인 일관성 체크
- PASS: 웹 홈/가격 화면에서 color/type/spacing/state를 공통 토큰(`--ds-*`) 기반으로 통일
- PASS: 모바일 로그인/홈 화면에서 `src/theme/*` + 공통 UI 컴포넌트로 시각 언어 통일
- PASS: CTA 톤을 행동 중심 문구로 통일 (`학습 시작`, `로그인 후 결제하기`, `다시 시도`)

## 2) 접근성/사용성 체크
- PASS: 웹 포커스 가시성 유지 (`app/globals.css`의 `:focus-visible`)
- PASS: 입력 라벨/오류 연결 강화 (`components/ui/Input.tsx`에 `aria-invalid`, `aria-describedby`)
- PASS: 모바일 주요 버튼 최소 터치 타깃(44px+) 유지
- PASS: 비동기/상태 메시지를 `Feedback` 컴포넌트로 일관 표시

## 3) 성능/렌더링 체크
- PASS: 과한 애니메이션 추가 없음, 기존 최소 모션 유지
- PASS: 모바일 홈 필터는 `useMemo` 기반 파생 계산으로 불필요 연산 최소화
- PASS: 대규모 구조 리팩터 없이 화면 단위 교체로 렌더 리스크 제한

## 4) 토큰 위반 점검
- PASS (적용 화면 기준)
  - Web: `app/page.tsx`, `app/pricing/page.tsx`, `components/payments/PricingActions.tsx`
  - Mobile: `src/app/(auth)/login.tsx`, `src/features/home/HomeScreen.tsx`
- 비고: 토큰 정의 파일(`app/globals.css`, `src/theme/*`)은 리터럴 선언 허용 범위로 처리

## 5) 검증 명령 실행 결과

### Web (C:/dev/englishapp)
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `npm run codex:workflow:check`: FAIL
  - 원인: `ai:review:gate`가 기존 staged 백엔드 파일의 P1 리뷰 이슈로 차단
  - 참고: 디자인 시스템 변경 파일 자체 lint/typecheck/build/test는 통과

### Mobile (C:/dev/englishapp-mobile)
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run build`: PASS

## 남은 리스크 / TODO
1. `codex:workflow:check` 차단 원인인 기존 staged 백엔드 P1 이슈를 별도 트랙으로 정리/해소
2. 웹 워드북 화면(`app/wordbooks/page.tsx`)까지 토큰 기반 단순화 확장
3. 모바일 워드북 상세/설정 화면으로 공통 컴포넌트 적용 범위 확대
4. provider 버튼(네이버/카카오) 브랜드 색 사용 영역을 토큰 예외 규칙 문서화
5. QA 자동화(토큰 위반 탐지 스크립트) 추가로 회귀 방지
