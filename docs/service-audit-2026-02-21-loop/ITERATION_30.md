# ITERATION 30 (2026-02-21)

## 범위
- 카드 학습 키보드/메시지 루프 개선: `/wordbooks/[id]/cards`

## 변경 체크리스트 (10개)
- [x] 이전 파트 이동 공용 함수(`moveToPrevPart`) 추가
- [x] 첫 파트 경계에서 안내 메시지(`첫 파트입니다`) 제공
- [x] 초기 렌더 시 파트 이동 안내 메시지 스킵(ref guard)
- [x] 상태 메시지 자동 정리(4.5초 후 clear)
- [x] `M` 키로 뜻 보기/숨기기 토글 지원
- [x] `0` 키로 현재 파트 첫 카드 즉시 이동 지원
- [x] `[`/`P`/`PageUp`를 이전 파트 공용 함수로 통일
- [x] `]`/`N`/`PageDown`를 다음 파트 공용 함수로 통일
- [x] 단축키 안내 문구에 `M`, `0` 반영
- [x] 파트 이전 버튼 클릭도 공용 함수 사용으로 경계 처리 일관화

## 구현 파일
- `app/wordbooks/[id]/cards/wordbookCardsClient.tsx`

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과
