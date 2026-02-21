# Iteration 102 (2026-02-21)

## 점검 범위
- 성능 최적화 점검: `components/wordbooks/WordbookListClient.tsx`
- 파트 네비게이션 계산(`parts`, `visibleParts`) 렌더 비용 분석

## 확인된 최적화 포인트
1. `parts` 배열이 렌더마다 재생성됨
2. `visibleParts` 계산 중 `parts.find(...)` 반복으로 불필요한 선형 탐색이 발생

## 조치
- `components/wordbooks/WordbookListClient.tsx`
  - `parts`를 `useMemo`로 메모이즈
  - `partByIndex(Map)`를 추가해 파트 조회를 O(1)로 변경
  - `visibleParts` 생성 시 `parts.find` 대신 `partByIndex.get` 사용

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과

## 비고
- 결제 관련 경로/코드는 변경하지 않음
