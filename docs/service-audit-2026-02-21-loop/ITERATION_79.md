# Iteration 79 (2026-02-21)

## 점검 범위
- MCP Playwright 실동작 점검: `https://www.oingapp.com/wordbooks/55/list-correct`
- 목록 페이지 초기 로딩 수치 노출 상태 확인

## 확인된 리스크
1. 데이터 미수신 초기 로딩에서도 `총 0개 / 1개 파트`, `현재 1파트: 0/0 (0%)`가 먼저 표시됨
2. 실제 데이터 로드 전 0 수치가 확정값처럼 보일 수 있어 진행 상태 오인 가능성 존재

## 조치
- `components/wordbooks/WordbookListClient.tsx`
  - 초기 로딩(`loading && totalItems === 0`) 판별값 추가
  - 초기 로딩 중 상단 요약 수치(총 개수/파트 수/현재 파트 매칭/비율/남은 파트)를 `-` 플레이스홀더로 표시

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과

## 비고
- 결제 관련 경로/코드는 변경하지 않음
