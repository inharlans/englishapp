# 모바일-웹 패리티 실행 백로그 (백엔드/기능 중심)

Back to [AGENTS.md](../AGENTS.md)

## 실행 원칙

- UI/디자인은 제외하고 API/도메인/기능 정합성만 다룬다.
- 1차(P0) 완료 후 2차(P1/P2)로 확장한다.
- 각 항목은 "웹과 동일 계정 기준 결과 일치"를 완료 조건으로 둔다.

## P0 (1차, 즉시)

## EPIC-01 인증/세션 정합성
- [x] `GET /api/auth/sessions` 추가 (모바일 세션 목록 제공)
- [x] `DELETE /api/auth/sessions/[sessionId]` 추가 (모바일 세션 강제 종료)
- [x] Bearer mutation allowlist에 `DELETE /api/auth/sessions/[sessionId]` 반영
- [x] 모바일에서 `x-device-id` 전송 반영(`sessions` API 요청)

## EPIC-02 클리퍼 경로 정합성
- [x] `POST /api/clipper/candidates` 호환 라우트 추가
- [x] `POST /api/word-capture` 호환 라우트 추가 (`clipperService.captureWord` 기반)
- [x] Bearer mutation allowlist에 `POST /api/word-capture` 반영
- [x] 모바일 클라이언트를 최종 표준 경로(`POST /api/clipper/capture`)로 전환

## EPIC-03 단어장/학습 핵심 패리티
- [x] 모바일 단어장 목록을 소유+다운로드 병합으로 정렬
- [x] 모바일 학습 결과 저장을 `POST /api/wordbooks/[id]/study/items/[itemId]`에 완전 연동
- [x] 모바일 퀴즈 제출을 `POST /api/wordbooks/[id]/quiz/submit`에 완전 연동
- [x] 모바일 로컬 계산 의존(학습/퀴즈) 제거 및 서버 권위 모델 전환
- [x] 학습/퀴즈 라우트 계약 테스트 추가(`study/items`, `quiz/submit`)

## EPIC-04 설정 기능 정합성
- [x] `PATCH /api/users/me/study-preferences` 서버 호환 지원 추가(요청 partSize 반영 응답)
- [x] `GET|PATCH /api/users/me/clipper-settings` 모바일 화면 연동
- [x] `POST /api/users/me/daily-goal` 모바일 화면 연동
- [x] `GET|DELETE /api/blocked-owners` 모바일 화면 연동
- [x] 설정 API 3종 라우트 테스트 추가(`clipper-settings`, `daily-goal`, `blocked-owners`)

## P1 (2차, 안정화)

## EPIC-05 계약 테스트/회귀 자동화
- [x] 모바일 API wrapper 계약 테스트 추가(응답 shape drift 방어)
- [x] 404 Known Gap 재발 감시 스크립트 추가(`ops:mobile-known-gaps:check`)
- [x] 백엔드 패리티 통합 점검 커맨드 추가(`ops:mobile-parity:backend-check`)
- [x] 교차 검증(웹 작업 -> 모바일 반영, 모바일 작업 -> 웹 반영) 자동화

## EPIC-06 운영 품질
- [x] 장애 우선순위 룰(권한/데이터 불일치 최우선) 문서화
- [x] 릴리즈 전 고정 검증 루틴 문서화
- [x] 패리티 점검 리포트 템플릿 고정

## P2 (2차 확장)

## EPIC-07 고급 기능
- [ ] 대량 아이템 편집/검증 API 흐름 정렬
- [ ] import/export 모바일 연계 정책 확정
- [ ] 마켓 고급 필터/리뷰 UX의 기능 정책을 웹과 동일화

## 오늘 실행 로그

- [x] 세션 API 2종 신규 추가 (`/api/auth/sessions`, `/api/auth/sessions/[sessionId]`)
- [x] 클리퍼 호환 API 2종 신규 추가 (`/api/clipper/candidates`, `/api/word-capture`)
- [x] Bearer mutation allowlist 확장(세션 삭제/word-capture)
- [x] 신규 라우트 단위 테스트 추가(세션/클리퍼/word-capture/study-preferences PATCH)
- [x] 신규 라우트 예외 관측 표준화(`captureAppError` + `errorJson`)
- [x] 패리티 계획서 1차/2차 문서화 완료
- [x] API wrapper 계약 테스트 추가(`lib/api/mobileParity.test.ts`)
- [x] 교차 검증 자동화 스크립트 추가(`ops:mobile-parity:cross-check`)
- [x] 운영 룰/릴리즈 루틴/리포트 템플릿 문서화
