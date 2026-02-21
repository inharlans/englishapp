# ITERATION 28 (2026-02-21)

## 범위
- 카드 학습 이어보기 정확도 보강: `/wordbooks/[id]/cards`

## 변경 체크리스트 (10개)
- [x] 파트별 셔플 시드 저장 키 추가(`wordbook_cards_seed_*`)
- [x] 파트 진입 시 기존 시드 복원, 없으면 신규 시드 생성
- [x] 카드 셔플을 랜덤 실행이 아닌 시드 기반 `shuffleBySeed`로 고정
- [x] `현재 파트 다시 섞기` 시 신규 시드 발급/저장
- [x] 상단 `섞기` 버튼도 신규 시드 발급/저장으로 동작 통일
- [x] 이어보기 저장값에 `currentItemId` 포함
- [x] 이어보기 복원 시 `idx`보다 `currentItemId` 매칭을 우선 적용
- [x] 카드 데이터 변동 시에도 가능한 동일 카드로 복원되도록 보강
- [x] 시드/이어보기 localStorage 접근 예외 안전 처리
- [x] 훅 의존성 정리로 lint 경고 제거

## 구현 파일
- `app/wordbooks/[id]/cards/wordbookCardsClient.tsx`

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과
