# Iteration 86 (2026-02-21)

## 점검 범위
- MCP 실측 점검: `https://www.oingapp.com/wordbooks/55/quiz-word` 진입 후 로그인 페이지 전환
- `AppNav` 로그인 링크의 `next` 경로 보존 동작 확인

## 확인된 리스크
1. `https://www.oingapp.com/login?next=%2Fwordbooks%2F55%2Fquiz-word` 상태에서 상단 `로그인` 버튼을 다시 누르면 `next`가 `/wordbooks`로 덮어써짐
2. 사용자가 원래 가려던 세부 학습 경로(`wordbooks/[id]`)가 유실되어 로그인 후 복귀 동선이 끊김

## 조치
- `components/AppNav.tsx`
  - `normalizeNextPath` 추가
  - 현재 경로가 `/login`일 때는 쿼리의 기존 `next`를 정규화하여 그대로 유지
  - 비정상 `next` 값은 `/wordbooks`로 안전하게 폴백

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과

## 비고
- 결제 관련 경로/코드는 변경하지 않음
