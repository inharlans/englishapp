# ITERATION 29 (2026-02-21)

## 범위
- 카드 파트 학습 루프 자동화 강화: `/wordbooks/[id]/cards`

## 변경 체크리스트 (10개)
- [x] `autoAdvancePart` 상태 추가(자동 다음 파트 이동)
- [x] 자동 이동 설정 로컬 저장(`wordbook_cards_auto_advance_*`)
- [x] `A` 단축키로 자동 이동 토글 지원
- [x] `N` 키 다음 파트 이동 로직을 공용 함수로 통일
- [x] 카드 `다음` 버튼에서 마지막 카드 도달 시 자동 파트 전환 지원
- [x] 마지막 카드 도달 시 안내 메시지 보강
- [x] 파트 정보 바에 `남은 카드/남은 파트` 지표 추가
- [x] 파트 완료 카드에 자동 이동 상태 표시
- [x] 상단에 자동 이동 토글 버튼 추가(aria-pressed)
- [x] 훅 의존성 정리(`useCallback`)로 키 핸들러 안정화

## 구현 파일
- `app/wordbooks/[id]/cards/wordbookCardsClient.tsx`

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과
