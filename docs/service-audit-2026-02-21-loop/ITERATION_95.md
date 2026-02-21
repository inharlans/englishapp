# Iteration 95 (2026-02-21)

## 점검 범위
- MCP 실측 점검: `https://www.oingapp.com/`에서 숫자 키 입력 동작 확인
- 전역 숫자 단축키 컴포넌트(`KeyboardPageNavigator`) 적용 범위 점검

## 확인된 리스크
1. 홈/마켓 같은 비학습 화면에서도 숫자 키(예: `2`) 입력 시 학습 라우트(`/memorize`)로 강제 이동됨
2. 폼 입력 의도가 아닌 일반 페이지 키 입력이 페이지 전환으로 해석되어 동선이 끊길 수 있음

## 조치
- `components/KeyboardPageNavigator.tsx`
  - 단축키 허용 경로를 학습 화면으로 제한
  - 허용 대상: 레거시 학습 경로(`/memorize`, `/quiz-*`, `/list-*`) 및 `wordbooks/[id]` 학습 하위 경로
  - 비학습 페이지에서는 숫자 단축키 핸들러를 등록하지 않도록 수정

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과

## 비고
- 결제 관련 경로/코드는 변경하지 않음
