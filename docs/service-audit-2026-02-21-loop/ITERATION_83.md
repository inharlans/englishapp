# Iteration 83 (2026-02-21)

## 점검 범위
- MCP 실사용 점검: `https://www.oingapp.com/wordbooks/market`
- 마켓 필터 요약 문구(`검색어/정렬/규모`) 확인

## 확인된 리스크
1. 필터 요약 문구에 내부 코드값(`top`, `all`)이 그대로 노출됨
2. 사용자 입장에서 의미가 직관적이지 않아 필터 상태 해석 비용이 증가함

## 조치
- `app/wordbooks/market/page.tsx`
  - `sort`/`size`를 사용자 라벨로 변환하는 `sortLabel`/`sizeLabel` 추가
  - 요약 문구를 `인기순`, `전체` 등 사용자 친화 라벨 기반으로 표시

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과

## 비고
- 결제 관련 경로/코드는 변경하지 않음
