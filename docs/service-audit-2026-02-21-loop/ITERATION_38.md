# ITERATION 38 (2026-02-21)

## 범위
- 학습 복귀 동선 보강: `ResumeStudyButton`

## 변경 체크리스트 (10개)
- [x] 마지막 탭 복귀 링크에 `partSize` 쿼리 포함
- [x] 마지막 탭 복귀 링크에 `partIndex` 쿼리 포함
- [x] 복귀 버튼에서 파트 정보를 `wordbook_part_size_*`, `wordbook_part_index_*`로 읽기
- [x] 유효값(Number/양수)만 쿼리에 반영
- [x] 카드 탭 비활성 시 복귀 탭을 `memorize`로 안전 fallback
- [x] 탭별 한글 라벨 매핑 함수 추가
- [x] 버튼 텍스트에 마지막 탭 라벨 노출
- [x] href 생성 로직을 쿼리 포함 함수로 확장
- [x] 기존 last-tab 저장/복원 로직 유지
- [x] 상세 페이지에서 “마지막 학습 이어서” 동선의 파트 연속성 개선

## 구현 파일
- `components/wordbooks/ResumeStudyButton.tsx`

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과
