# Iteration 81 (2026-02-21)

## 점검 범위
- MCP 실사용 점검: `https://www.oingapp.com/wordbooks/55`
- 상세 헤더 상단 `뒤로` 동선 검토

## 확인된 리스크
1. 상세 페이지 헤더의 `뒤로` 링크가 항상 `/wordbooks/market`으로 고정됨
2. 내 단어장/다운로드 목록(`/wordbooks`)에서 진입한 사용자는 되돌아갈 때 맥락이 끊김

## 조치
- `app/wordbooks/[id]/page.tsx`
  - `backHref` 계산 추가: `isOwner || downloadedAt`이면 `/wordbooks`, 아니면 `/wordbooks/market`
  - 헤더 `뒤로` 링크를 `backHref` 사용으로 변경

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과

## 비고
- 결제 관련 경로/코드는 변경하지 않음
