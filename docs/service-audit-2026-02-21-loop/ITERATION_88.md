# Iteration 88 (2026-02-21)

## 점검 범위
- MCP 실측 점검: `https://www.oingapp.com/wordbooks/market?scope=701%2B`
- 구형 공유 링크 쿼리(`scope`) 호환성 확인

## 확인된 리스크
1. 마켓 페이지는 현재 `size` 쿼리만 해석하고 `scope`는 무시함
2. 기존에 배포/공유된 구형 링크(`?scope=...`) 진입 시 필터가 `전체`로 초기화되어 의도와 다른 목록이 노출됨

## 조치
- `app/wordbooks/market/page.tsx`
  - `searchParams` 타입에 `scope` 추가
  - `size` 계산 시 `sp.size ?? sp.scope`를 사용해 레거시 쿼리를 하위 호환 처리

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과

## 비고
- 결제 관련 경로/코드는 변경하지 않음
