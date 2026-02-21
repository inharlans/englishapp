# Iteration 101 (2026-02-21)

## 점검 범위
- 성능 최적화 점검: `app/offline/page.tsx`
- 오프라인 라이브러리 목록 필터/정렬 및 날짜 포맷 렌더 비용 분석

## 확인된 최적화 포인트
1. `Intl.DateTimeFormat`이 렌더 경로에서 반복 생성될 수 있음
2. `savedAt` 정렬 시 `localeCompare(..., "ko")` 호출이 항목 비교마다 반복됨
3. 검색어 소문자 변환(`trimmedQuery.toLowerCase()`)이 항목 필터 루프 내부에서 반복됨

## 조치
- `app/offline/page.tsx`
  - `Intl.DateTimeFormat("ko-KR", ...)`를 `useMemo`로 1회 생성 후 재사용
  - `Intl.Collator("ko")`를 `useMemo`로 생성하고 정렬 비교에 재사용
  - `queryLower`를 루프 밖에서 1회 계산 후 필터 조건에서 재사용

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과

## 비고
- 결제 관련 경로/코드는 변경하지 않음
