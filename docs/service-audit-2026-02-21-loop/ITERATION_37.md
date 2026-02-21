# ITERATION 37 (2026-02-21)

## 범위
- 학습 공통 파트 훅 개선: `useWordbookParting`

## 변경 체크리스트 (10개)
- [x] URL 기반 동기화 로직을 `syncFromLocation`으로 분리
- [x] `popstate` 이벤트 수신으로 브라우저 뒤로/앞으로 시 파트 상태 동기화
- [x] localStorage 읽기 실패 시 안전 fallback 처리
- [x] localStorage 쓰기 실패 시 예외 안전 처리(주석 포함)
- [x] 초기 로드와 이력 이동 모두 동일 동기화 경로 사용
- [x] part clamp 보정 시 localStorage 쓰기 예외 처리 보강
- [x] `setPartSize` localStorage 쓰기 예외 처리 보강
- [x] `setPartIndex` localStorage 쓰기 예외 처리 보강
- [x] totalItems 변동 시 URL 우선 복원 정책 유지
- [x] 학습 전 경로(`memorize/cards/quiz/list`) 공통 안정성 향상

## 구현 파일
- `components/wordbooks/useWordbookParting.ts`

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과
