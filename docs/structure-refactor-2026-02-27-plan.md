# API 구조 리팩터링 계획 (2026-02-27)

## 목표
- `app/api` 라우트의 반복 보일러플레이트(ID 파싱/인증 가드)를 공통화한다.
- 라우트 레이어를 "입력 검증 + 도메인 호출 + 응답 매핑" 중심으로 얇게 유지한다.
- 이후 단계에서 라우트의 직접 Prisma 접근을 `server/domain/*`로 점진 이관할 기반을 만든다.

## 범위 (Phase 1)
1. 공통 라우트 헬퍼 추가
   - `parsePositiveIntParam`
   - `requireUserFromRequest`
2. 단어장 변경/학습 경로 우선 적용
   - `/api/wordbooks/[id]/download`
   - `/api/wordbooks/[id]/publish`
   - `/api/wordbooks/[id]/sync-download`
   - `/api/wordbooks/[id]/study/items/[itemId]`
3. 관리자 파라미터 파싱 일관화
   - `/api/admin/users/[id]/plan`
    - `/api/admin/reports/[id]`

## 범위 (Phase 2)
1. 단어장 소유권/요금제 수정 가드 공통화
   - `requireOwnedWordbook`
   - `getWordbookEditPlanGuardError`
2. 중복 가드 로직을 단어장 변경 라우트에 적용
   - `/api/wordbooks/[id]/items`
   - `/api/wordbooks/[id]/items/[itemId]`
   - `/api/wordbooks/[id]/import`
   - `/api/wordbooks/[id]/publish`
3. 파라미터/인증 헬퍼 확장 적용
   - `/api/wordbooks/[id]/export`

## 범위 (Phase 3)
1. 잔여 라우트의 로컬 `parseId` 제거
   - `/api/wordbooks/[id]/block`
   - `/api/wordbooks/[id]/quiz`
   - `/api/wordbooks/[id]/quiz/submit`
   - `/api/wordbooks/[id]/reviews`
   - `/api/wordbooks/[id]`
   - `/api/wordbooks/[id]/study`
   - `/api/words/[id]`
2. 잔여 인증 반복 로직을 공통 헬퍼(`requireUserFromRequest`)로 통일

## 범위 (Phase 4)
1. 대형 라우트 쿼리 빌더 분리
   - 대상: `/api/wordbooks/[id]/study`
   - 추출: 필터 where 빌더, part-stats SQL 빌더
2. 라우트 파일 책임 축소
   - 라우트는 입력 파싱/권한 확인/응답 매핑 중심 유지

## 범위 (Phase 5)
1. 학습 조회 오케스트레이션을 도메인 서비스로 이관
   - 대상: `/api/wordbooks/[id]/study`
   - 추가: `server/domain/wordbook/study-service.ts`
2. 라우트에서 DB/캐시 처리 제거
   - 라우트는 파라미터 파싱 + 접근 제어 + 서비스 결과 매핑만 담당

## 범위 (Phase 6)
1. 학습 결과 기록 API 오케스트레이션 서비스 이관
   - 대상: `/api/wordbooks/[id]/study/items/[itemId]`
   - 추가: `server/domain/wordbook/study-item-service.ts`
2. 라우트 단순화
   - 라우트는 요청 검증/접근 제어/서비스 결과 응답만 담당

## 범위 (Phase 7)
1. 다운로드 오케스트레이션 서비스 이관
   - 대상: `/api/wordbooks/[id]/download`
   - 추가: `server/domain/wordbook/download-service.ts`
2. 메트릭 응답 헬퍼 도입
   - 추가: `lib/api/metric-response.ts`
   - 라우트에서 중복 `recordApiMetric + NextResponse.json` 패턴 제거

## 범위 (Phase 8)
1. 동기화 다운로드 오케스트레이션 서비스 이관
   - 대상: `/api/wordbooks/[id]/sync-download`
   - 추가: `server/domain/wordbook/sync-download-service.ts`
2. 라우트 단순화
   - 라우트는 요청 검증/인증/서비스 결과 응답만 담당

## 범위 (Phase 9)
1. 단어장 콘텐츠 서비스 이관
   - 대상: `/api/wordbooks/[id]/publish`, `/api/wordbooks/[id]/import`, `/api/wordbooks/[id]/export`
   - 추가: `server/domain/wordbook/content-service.ts`
2. 라우트 단순화
   - 라우트는 요청 검증/레이트리밋/인증/서비스 결과 응답만 담당

## 범위 (Phase 10)
1. 결제 라우트 공통 가드/메트릭 패턴 추출
   - 추가: `lib/api/mutation-route.ts`
   - 확장: `lib/api/metric-response.ts`
2. 결제 API 라우트 단순화
   - 대상: `/api/payments/checkout`, `/api/payments/confirm`, `/api/payments/portal`

## 비범위 (Phase 1 제외)
- 라우트의 비즈니스 로직 자체 재설계
- 서비스/리포지토리 계층의 대규모 인터페이스 변경
- 레거시 `/api/quiz/submit` 계약 제거

## 완료 조건
- 대상 라우트에서 로컬 `parseId` 제거
- 인증/파라미터 처리 로직이 공통 헬퍼로 통일
- `npm run codex:workflow:check` 통과
