# ITERATION 49 (2026-02-22)

## 범위
- 공통 네비게이션/키보드 이동 안정화 (`AppNav`, `KeyboardPageNavigator`)

## 변경 체크리스트 (10개)
- [x] `AppNav`에서 현재 query string 읽기 (`useSearchParams`) 추가
- [x] 로그인 복귀 경로(`next`)를 `pathname + query` 기준으로 생성
- [x] 로그인 페이지 진입 시 기본 복귀 경로는 `/wordbooks` 유지
- [x] 키보드 숫자 이동을 `/login`에서 비활성화
- [x] 키보드 숫자 이동을 `/logout`에서 비활성화
- [x] 키보드 숫자 이동을 `/terms`에서 비활성화
- [x] 키보드 숫자 이동을 `/privacy`에서 비활성화
- [x] 키보드 숫자 이동을 `/pricing`에서 비활성화
- [x] typecheck 회귀 검증
- [x] lint 회귀 검증

## 구현 파일
- `components/AppNav.tsx`
- `components/KeyboardPageNavigator.tsx`

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과
