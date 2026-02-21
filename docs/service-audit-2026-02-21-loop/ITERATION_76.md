# Iteration 76 (2026-02-21)

## 점검 범위
- MCP Playwright 실동작 점검: `https://www.oingapp.com/wordbooks/55/cards`
- 초기 로딩 구간의 카드 요약 수치(전체/파트/범위/남은 카드) 확인

## 확인된 리스크
1. 데이터 미수신 초기 로딩 상태에서도 `전체 0개 / 1개 파트`처럼 확정 수치가 먼저 노출됨
2. 실측 스냅샷에서 로딩 직후 0 기반 지표가 표시되었다가 이후 실제 값으로 바뀌어 오인 가능성 존재

## 조치
- `app/wordbooks/[id]/cards/wordbookCardsClient.tsx`
  - 초기 로딩(`loading && items.length === 0`) 판별값 추가
  - 카드 요약 지표를 초기 로딩 시 `-` 플레이스홀더로 표시하도록 라벨 보정
  - 대상: 전체 개수/파트 수/현재 범위/남은 카드/남은 파트/전체 기준 진행 문구

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과

## 비고
- 결제 관련 경로/코드는 변경하지 않음
