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

## 비범위 (Phase 1 제외)
- 라우트의 비즈니스 로직 자체 재설계
- 서비스/리포지토리 계층의 대규모 인터페이스 변경
- 레거시 `/api/quiz/submit` 계약 제거

## 완료 조건
- 대상 라우트에서 로컬 `parseId` 제거
- 인증/파라미터 처리 로직이 공통 헬퍼로 통일
- `npm run codex:workflow:check` 통과
