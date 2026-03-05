# 모바일-웹 패리티 E2E 체크리스트 (기능/백엔드)

Back to [AGENTS.md](../AGENTS.md)

## 목적

- 동일 계정 기준으로 모바일/웹/DB 결과가 일치하는지 최종 검증한다.
- UI 스타일 평가는 제외하고, API 계약/권한/데이터 정합성만 확인한다.

## 사전 조건

- 모바일: 최신 빌드 반영
- 서버: 최신 배포 반영
- 테스트 계정 1개 준비
- 서버 검증 명령 가능:
  - `npm run ops:mobile-parity:backend-check`

## 1단계: 서버 계약/보안 게이트

- [ ] `npm run ops:mobile-parity:backend-check` 통과
- [ ] `npm run typecheck` 통과
- [ ] `npm run codex:workflow:check` 실행

## 2단계: 인증/세션

- [ ] 모바일 OAuth 로그인 성공
- [ ] `/api/auth/mobile/refresh` 회전 성공
- [ ] 이전 refresh 재사용 시 차단(`AUTH_REFRESH_CONCURRENT`)
- [ ] 설정 > 세션 목록에서 현재 세션 `isCurrent=true` 표시
- [ ] 다른 세션 로그아웃 성공

## 3단계: 학습/퀴즈 서버 권위 플로우

- [ ] 모바일 암기 화면에서 카드 진행 시 학습 결과 저장 성공
- [ ] 모바일 퀴즈 제출 시 서버 채점 결과(`correct`) 반영
- [ ] 동일 단어장 웹 화면에서 학습 상태/집계 반영 확인
- [ ] 오류 응답(401/403/429) 시 앱이 무한 재시도 없이 종료

## 4단계: 설정 API 연동

- [ ] Part 크기 저장 성공 (`PATCH /api/users/me/study-preferences`)
- [ ] 클리퍼 기본 단어장 저장 성공 (`PATCH /api/users/me/clipper-settings`)
- [ ] 당일 목표 저장 성공 (`POST /api/users/me/daily-goal`)
- [ ] 차단 목록 조회/해제 성공 (`GET|DELETE /api/blocked-owners`)

## 5단계: 클리퍼/저장

- [ ] 후보 추출 성공 (`POST /api/clipper/candidates`)
- [ ] 선택 단어 저장 성공 (`POST /api/clipper/capture` 경유)
- [ ] 저장 후 모바일 홈/단어장 요약 값이 갱신됨

## 6단계: 데이터 정합성(DB)

- [ ] `MobileRefreshToken` 생성/회전 상태가 인증 로그와 일치
- [ ] 단어장 아이템 수/학습 상태가 웹/모바일에서 동일
- [ ] 차단/해제 상태가 웹/모바일 양쪽에서 동일

## 실패 분류

- `AUTH`: 로그인/토큰/권한 문제
- `CONTRACT`: 경로/필드/상태코드 불일치
- `STATE`: DB 반영 불일치
- `RATE_LIMIT`: 제한 정책 오동작

## 최종 판정

- PASS: 전 항목 통과
- PARTIAL: 핵심 플로우 통과, Known Gap 또는 비핵심 1~2건 잔존
- FAIL: 인증/학습저장/퀴즈제출/설정저장 중 1개 이상 실패
