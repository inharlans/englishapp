# ITERATION 35 (2026-02-21)

## 범위
- 학습 공통 탭 개선: `/wordbooks/[id]/*` 공통 `WordbookStudyTabs`

## 변경 체크리스트 (10개)
- [x] 현재 탭 `aria-current=page` 반영
- [x] 탭별 접근성 라벨(`aria-label`)에 현재 탭 여부 반영
- [x] 탭 `title`에 현재 파트 컨텍스트 표시
- [x] 탭 상태 `data-state(active/inactive)` 노출
- [x] 모바일에서 탭 가로 스크롤(`overflow-x-auto`, `whitespace-nowrap`) 지원
- [x] 스크린리더 상태 안내(`현재 탭/파트/파트크기`) 추가
- [x] 탭 컨테이너 레이아웃 정리(`items-center`, `pb-1`)
- [x] 뒤로 링크가 `partSize/partIndex` 쿼리를 유지하도록 보강
- [x] 기존 last-tab 로컬 저장 동작 유지
- [x] 모든 학습 하위 화면(`memorize/cards/quiz/list`) 공통 적용

## 구현 파일
- `components/wordbooks/WordbookStudyTabs.tsx`

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과
