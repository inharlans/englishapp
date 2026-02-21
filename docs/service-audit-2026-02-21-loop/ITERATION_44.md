# ITERATION 44 (2026-02-21)

## 범위
- MCP 실측 기반 `/login`, `/wordbooks/new` 접근성/상태 피드백 보강

## 변경 체크리스트 (10개)
- [x] 로그인 페이지 Suspense fallback에 `role=status`/`aria-live` 추가
- [x] 로그인 제출 버튼 로딩 상태 `aria-busy` 추가
- [x] 로그인 에러 메시지 `role=alert` 추가
- [x] OAuth 에러 메시지 `role=alert` 추가
- [x] Google OAuth 링크 `aria-label` 보강
- [x] 네이버 OAuth 링크 `aria-label` 보강
- [x] 카카오 OAuth 링크 `aria-label` 보강
- [x] 단어장 생성 제출 버튼 로딩 상태 `aria-busy` 추가
- [x] 단어장 생성 상태 메시지 `role=status`/`aria-live` 추가
- [x] 단어장 생성 에러 메시지 `role=alert` 추가

## 구현 파일
- `app/login/page.tsx`
- `components/auth/LoginPanel.tsx`
- `app/wordbooks/new/page.tsx`

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과
