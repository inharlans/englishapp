# Iteration 75 (2026-02-21)

## 점검 범위
- MCP Playwright 실동작 점검: `https://www.oingapp.com/offline/wordbooks/55`
- 오프라인 카드 학습 진입/새로고침/섞기 동선 확인

## 확인된 리스크
1. 사용자가 `섞기`를 누르지 않아도 새로고침할 때마다 카드 순서가 매번 랜덤으로 바뀜
2. 실측 재현: 첫 카드가 `interest` -> 새로고침 후 `well`로 변경
3. `R/섞기` 단축키가 따로 존재하므로 기본 랜덤은 사용자 기대와 충돌

## 조치
- `app/offline/wordbooks/[id]/StudyClient.tsx`
  - 기본 로드(`orderSeed === 0`)에서는 원본 순서를 유지
  - `R` 단축키/`섞기` 버튼 실행 시(`orderSeed > 0`)에만 셔플 적용

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과

## 비고
- 결제 관련 경로/코드는 변경하지 않음
