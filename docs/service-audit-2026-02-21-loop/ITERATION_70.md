# Iteration 70 (2026-02-21)

## 점검 범위
- MCP Playwright 실동작 점검: `https://www.oingapp.com/wordbooks/55/list-wrong`
- `/card` 외 경로 점검 요청에 따라 목록 화면(오답 목록) 중심으로 UI 가독성 확인

## 확인된 리스크
1. 목록 카드 상태 이력 문구가 `Y/N` 축약(`이력 정답:N 오답:Y`)으로 노출되어 의미 해석 비용이 큼
2. 빠른 스캔 시 이력 상태를 오해할 수 있어 복습 우선순위 판단이 늦어질 수 있음

## 조치
- `components/wordbooks/WordbookListClient.tsx`
  - 상태 이력 문구를 `Y/N`에서 `있음/없음`으로 변경
  - `정답/오답` 이력을 구분자(`·`)로 분리해 스캔 가독성 강화

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과

## 비고
- 결제 관련 경로/코드는 변경하지 않음
