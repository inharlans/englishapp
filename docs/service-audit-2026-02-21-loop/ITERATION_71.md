# Iteration 71 (2026-02-21)

## 점검 범위
- MCP Playwright 실동작 점검: `https://www.oingapp.com/offline`
- 검색 입력 동선 재현: 검색어 입력(`zzz-not-found`) 후 `Esc` 단축키 동작 확인

## 확인된 리스크
1. 검색 입력창이 포커스된 상태에서는 `Esc` 단축키가 동작하지 않음
2. 키 핸들러에서 `isTyping` 분기가 먼저 반환되어 검색어 초기화 로직에 도달하지 못함

## 조치
- `app/offline/page.tsx`
  - 전역 키 핸들러에서 `Esc` 검색어 초기화 분기를 `isTyping` 체크보다 앞으로 이동
  - 입력창 포커스 여부와 무관하게 `Esc`로 검색어 초기화 + 입력창 포커스 유지

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과

## 비고
- 결제 관련 경로/코드는 변경하지 않음
