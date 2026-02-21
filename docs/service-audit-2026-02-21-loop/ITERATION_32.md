# ITERATION 32 (2026-02-21)

## 범위
- 카드 외 영역 확장 점검/개선: `/wordbooks/[id]/memorize`

## 변경 체크리스트 (10개)
- [x] 암기 화면 페이지 크기(`pageSize`) 로컬 저장/복원
- [x] 암기 화면 마지막 페이지(`pageIndex`) 로컬 저장/복원
- [x] 키보드 `Home/End`로 처음/마지막 페이지 이동 지원
- [x] 하단 페이지네이션에 `처음`/`마지막` 버튼 추가
- [x] 페이지 이동 경계 메시지 보강(첫/마지막 페이지)
- [x] 상태 메시지 자동 정리(3.5초)
- [x] 헤더에 필터 결과 요약(`현재 표시 x / 전체 y`) 추가
- [x] 페이지 번호 직접 이동 시 경계 안내 메시지 추가
- [x] keydown 페이지 이동 로직을 `movePage` 공용 함수로 통일
- [x] 훅 의존성 정리로 lint 안정성 확보

## 구현 파일
- `app/wordbooks/[id]/study/studyClient.tsx`

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과
