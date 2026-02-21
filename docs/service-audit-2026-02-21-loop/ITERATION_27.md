# ITERATION 27 (2026-02-21)

## 범위
- 카드 학습 재방문 연속성 개선: `/wordbooks/[id]/cards`

## 변경 체크리스트 (10개)
- [x] 파트별 카드 위치 저장 키 도입(`wordbook_cards_progress_*`)
- [x] 파트 재진입 시 마지막 카드 위치 자동 복원
- [x] 파트 재진입 시 뜻 표시 상태(`showMeaning`) 복원
- [x] 이어보기 on/off 토글 추가
- [x] 이어보기 토글 상태를 로컬 저장(`wordbook_cards_resume_enabled_*`)
- [x] 이어보기가 꺼진 경우 복원 스킵 처리
- [x] 현재 파트 이어보기 위치 초기화 버튼 추가
- [x] 복원/초기화 결과를 상태 메시지로 노출
- [x] 파트 변경 시 복원 키 재평가(ref reset) 처리
- [x] localStorage 예외 안전 처리(try/catch)

## 구현 파일
- `app/wordbooks/[id]/cards/wordbookCardsClient.tsx`

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과
