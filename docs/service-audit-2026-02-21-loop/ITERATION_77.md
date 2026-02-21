# Iteration 77 (2026-02-21)

## 점검 범위
- MCP Playwright 실동작 점검: `https://www.oingapp.com/wordbooks/55/cards`
- 초기 진입 시 상태 메시지(`1파트로 이동했습니다.`) 노출 조건 확인

## 확인된 리스크
1. 사용자가 실제로 파트를 이동하지 않았는데도 초기 로딩 직후 `1파트로 이동했습니다.` 메시지가 노출됨
2. 원인: 파트 상태 effect가 데이터 미수신/로딩 구간에도 실행되며 파트 초기화 메시지를 트리거함

## 조치
- `app/wordbooks/[id]/cards/wordbookCardsClient.tsx`
  - 파트 변경 안내 effect에 `loading || items.length === 0` 가드 추가
  - 데이터 준비 전에는 안내 문구를 띄우지 않고, 실제 파트 이동 시에만 메시지 노출

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과

## 비고
- 결제 관련 경로/코드는 변경하지 않음
