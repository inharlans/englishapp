# ITERATION 39 (2026-02-21)

## 범위
- 학습 복귀 동선 추가 강화: `WordbookStudyTabs` + `ResumeStudyButton`

## 변경 체크리스트 (10개)
- [x] 학습 탭 클릭 시 마지막 학습 시각(`wordbook_last_studied_at_*`) 저장
- [x] 복귀 버튼에서 마지막 학습 시각 로드
- [x] 복귀 버튼 라벨에 마지막 파트(`n파트`) 표시
- [x] 복귀 버튼에 마지막 학습 시각(`Asia/Seoul` 기준 포맷) 표시
- [x] 복귀 버튼 레이아웃을 2줄 정보형으로 개선
- [x] 기존 탭/파트 컨텍스트 복귀 URL 유지
- [x] 카드 비활성 fallback 로직 유지
- [x] last-tab 저장 동작과 충돌 없이 시각 저장 병행
- [x] 시간값 유효성 검사(양수/유한값) 적용
- [x] 상세 페이지 복귀 CTA 정보밀도 개선

## 구현 파일
- `components/wordbooks/WordbookStudyTabs.tsx`
- `components/wordbooks/ResumeStudyButton.tsx`

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과
