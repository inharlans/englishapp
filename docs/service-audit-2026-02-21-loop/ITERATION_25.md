# ITERATION 25 (2026-02-21)

## 범위
- 카드 학습 경로 UX 추가 개선: `/wordbooks/[id]/cards`

## 변경 체크리스트 (10개)
- [x] 빈 파트에서 전체 진행률이 잘못 계산되던 문제 수정(`hasPartItems` 기준)
- [x] 헤더에 전체 기준 카드 위치(`전체 기준 x/y`) 표시 추가
- [x] 파트 전환 시 상태 메시지로 현재 파트 이동 피드백 제공
- [x] `Enter`로 뜻 보기/숨기기 토글 지원
- [x] `Escape`로 뜻 즉시 숨기기 지원
- [x] 파트 이동 버튼에 `처음/마지막` 추가
- [x] 카드 이동 버튼에 `처음/마지막` 추가
- [x] 단축키 안내 문구 보강(Enter/Esc 포함)
- [x] 파트 범위 표기 시 빈 파트(`-`) 처리 보정
- [x] 키보드 핸들러 의존성 정리(`showMeaning` 포함)

## 구현 파일
- `app/wordbooks/[id]/cards/wordbookCardsClient.tsx`

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과
