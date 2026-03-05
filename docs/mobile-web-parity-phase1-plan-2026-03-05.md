# 모바일-웹 패리티 1차 계획 (백엔드/기능)

Back to [AGENTS.md](../AGENTS.md)

## 목표

- 모바일 앱의 핵심 기능을 웹과 동일한 API/도메인 규칙으로 맞춘다.
- UI/디자인은 제외하고 백엔드 연동/기능 정합성만 다룬다.
- 결제 기능은 1차 범위에서 제외한다.

## 범위 (결제 제외)

- 인증/토큰: mobile start/exchange/refresh, Bearer 정책
- 단어장: 목록/상세/생성/수정/삭제/아이템 CRUD
- 마켓: 목록/평가/리뷰/신고/차단/다운로드/동기화
- 학습/퀴즈: study 조회, 학습 결과 저장, quiz 출제/제출
- 사용자 설정: clipper settings, daily goal, blocked owners
- 클리퍼 저장: capture 경로 표준화

## 실행 체크리스트

- [x] 세션 API 제공 (`GET /api/auth/sessions`, `DELETE /api/auth/sessions/[sessionId]`)
- [x] 클리퍼 호환 API 제공 (`POST /api/clipper/candidates`, `POST /api/word-capture`)
- [x] Bearer mutation allowlist 보강 (`/api/auth/sessions/[sessionId]`, `/api/word-capture`)
- [ ] 모바일 학습/퀴즈를 서버 상태 반영형으로 완전 전환
- [ ] 모바일 설정 화면에서 `clipper-settings`, `daily-goal`, `blocked-owners` 완전 연동
- [x] `PATCH /api/users/me/study-preferences` 서버 호환 지원 완료(요청 partSize 반영 응답)
- [ ] 정상 플로우에서 404/405 제거 확인

## 통과 기준

- 동일 계정 기준 웹/모바일 결과와 DB side-effect 일치
- 핵심 기능 플로우에서 404/405/500 재현 없음
- 토큰 회전/재사용 차단 검증 통과
