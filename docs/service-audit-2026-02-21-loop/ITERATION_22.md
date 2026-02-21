# ITERATION 22 (2026-02-21)

## 범위
- 카드 학습 경로: `/wordbooks/[id]/cards`

## 변경 체크리스트
- [x] 카드 화면에 파트 분할(`partSize/partIndex`) 적용
- [x] 파트 크기 입력, 이전/다음 파트 버튼 추가
- [x] 파트 번호 직접 이동 입력(`이동`) 추가
- [x] 카드 데이터/셔플/진행률을 현재 파트 기준으로 계산
- [x] 파트 전환 시 카드 인덱스/뜻 표시/안내 상태 초기화
- [x] 키보드 단축키 `[`/`]`로 파트 이동 지원
- [x] 빈 상태 안내를 파트 맥락 중심으로 수정
- [x] 암기 화면 이동 CTA에 `partSize/partIndex` 유지

## 구현 파일
- `app/wordbooks/[id]/cards/wordbookCardsClient.tsx`

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과
