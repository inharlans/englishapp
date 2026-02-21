# ITERATION 50 (2026-02-22)

## 범위
- 로그인 페이지 OAuth 에러 매핑 로직 리팩터링 (`/login`)

## 변경 체크리스트 (10개)
- [x] 중첩 삼항 기반 에러 매핑 로직 제거
- [x] `OAUTH_ERROR_MESSAGES` 상수 맵 도입
- [x] Google 오류 코드 매핑 일괄 이전
- [x] Naver 오류 코드 매핑 일괄 이전
- [x] Kakao 오류 코드 매핑 일괄 이전
- [x] 계정 연결 충돌/링크 실패 코드 매핑 유지
- [x] 미정의 오류 코드 fallback(`""`) 유지
- [x] 표시 문자열(사용자 메시지) 기존 값 유지
- [x] typecheck 회귀 검증
- [x] lint 회귀 검증

## 구현 파일
- `app/login/page.tsx`

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과
