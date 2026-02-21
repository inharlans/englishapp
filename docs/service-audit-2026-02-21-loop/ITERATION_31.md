# ITERATION 31 (2026-02-21)

## 범위
- 카드 학습 핸즈프리 개선: `/wordbooks/[id]/cards`

## 변경 체크리스트 (10개)
- [x] `autoSpeak` 상태 추가(카드 전환 시 자동 발음)
- [x] 자동 발음 설정 로컬 저장 키 추가(`wordbook_cards_auto_speak_*`)
- [x] 초기 진입 시 자동 발음 설정 복원
- [x] 자동 발음 토글 버튼 추가(aria-pressed)
- [x] `V` 단축키로 자동 발음 on/off 토글 지원
- [x] 토글 시 상태 메시지(`자동 발음: 켜짐/꺼짐`) 제공
- [x] 현재 카드 변경 시 TTS 자동 실행 effect 추가
- [x] speak 언어(`speakLang`) 반영 유지
- [x] speechSynthesis 미지원/오류 시 안전 예외 처리
- [x] 단축키 안내 문구에 `V` 추가

## 구현 파일
- `app/wordbooks/[id]/cards/wordbookCardsClient.tsx`

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과
