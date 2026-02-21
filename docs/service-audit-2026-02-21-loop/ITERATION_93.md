# Iteration 93 (2026-02-21)

## 점검 범위
- MCP 실측 점검: `https://www.oingapp.com/wordbooks/market?page=2&sort=top&size=all`
- 마켓 화면 내 로그인 링크(`상단 인라인`, `상단 CTA`, `카드 CTA`)의 `next` 일관성 점검

## 확인된 리스크
1. 동일한 마켓 화면에서도 클릭한 로그인 버튼에 따라 `next` 대상 URL이 달라질 수 있음
2. 결과적으로 로그인 후 복귀 화면이 버튼별로 달라져 사용자 동선 일관성이 깨질 수 있음

## 조치
- `app/wordbooks/market/page.tsx`
  - 마켓 로그인 링크의 `next`를 정규화된 내부 상태값이 아닌, 현재 요청 URL 쿼리(`searchParams`) 기반으로 통일
  - `marketNextPath`를 구성해 모든 로그인 링크에서 동일하게 재사용

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과

## 비고
- 결제 관련 경로/코드는 변경하지 않음
