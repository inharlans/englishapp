# Iteration 87 (2026-02-21)

## 점검 범위
- MCP 실측 점검: `https://www.oingapp.com/wordbooks/market?sort=top&scope=all&q=test`
- 비로그인 상태 마켓 진입 시 로그인 유도 링크들의 복귀 경로(`next`) 일관성 확인

## 확인된 리스크
1. 마켓 상단 안내문(게스트 미리보기)의 인라인 `로그인` 링크만 `/login`으로 고정
2. 동일 화면의 다른 로그인 CTA는 `next`를 포함하는데, 인라인 링크만 예외라 로그인 후 필터 상태 복귀가 끊김

## 조치
- `app/wordbooks/market/page.tsx`
  - 인라인 로그인 링크를 `marketLoginHref`로 통일
  - 현재 검색/정렬/규모/페이지 상태를 `next`에 보존해 로그인 후 같은 마켓 상태로 복귀 가능하도록 수정

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과

## 비고
- 결제 관련 경로/코드는 변경하지 않음
