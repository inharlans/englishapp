# Iteration 89 (2026-02-21)

## 점검 범위
- MCP 실측 점검: `https://www.oingapp.com/wordbooks/abc/memorize`
- `wordbooks/[id]/memorize`의 ID 검증 및 로그인 유도 순서 점검

## 확인된 리스크
1. `memorize` 페이지에서 ID 검증보다 로그인 분기가 먼저 실행됨
2. 잘못된 ID(`abc` 등)에서도 로그인 페이지로 이동하며 `next=/wordbooks/abc/memorize`가 생성되어, 로그인 후 무효 경로로 복귀하는 혼란이 발생

## 조치
- `app/wordbooks/[id]/memorize/page.tsx`
  - ID 파싱/검증을 로그인 체크보다 먼저 수행하도록 순서 변경
  - 로그인 링크의 `next`는 검증된 숫자 `id`만 사용하도록 보정

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과

## 비고
- 결제 관련 경로/코드는 변경하지 않음
