# ITERATION 26 (2026-02-21)

## 범위
- 카드 학습 파트 완료 동선 개선: `/wordbooks/[id]/cards`

## 변경 체크리스트 (10개)
- [x] 파트 완료 상태 계산 추가(`isPartComplete`)
- [x] 파트 완료 시 상태 카드(`role=status`) 노출
- [x] 파트 완료 카드에 `현재 파트 다시 섞기` 액션 추가
- [x] 파트 완료 카드에 `다음 파트로 이동` 액션 추가
- [x] `N` 키로 다음 파트 이동 지원
- [x] `P` 키로 이전 파트 이동 지원
- [x] 단축키 안내에 `P/N` 반영
- [x] 완료 상태에서 즉시 다음 파트 이동 가능한 버튼 비활성 처리(마지막 파트)
- [x] 완료 상태에서 재학습 시 인덱스/뜻 표시 초기화
- [x] 카드 파트 반복 학습 루프 전환 동선 강화

## 구현 파일
- `app/wordbooks/[id]/cards/wordbookCardsClient.tsx`

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과
