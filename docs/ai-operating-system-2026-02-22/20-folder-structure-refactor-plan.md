# Folder Structure Refactor Plan (Session-Continuable)

Date: 2026-02-22  
Goal: "로그인 작업이면 auth 도메인 폴더만 보면 되는 구조"로 전환

## 1) 목표 구조
```text
server/
  core/
    config.ts
    errors.ts
  infra/
    prisma.ts
    auth.ts
  domain/
    auth/
      contracts.ts
      repository.ts
      service.ts
      mapper.ts
    wordbook/
      contracts.ts
      repository.ts
      service.ts
    quiz/
      contracts.ts
      repository.ts
      service.ts
    payments/
      contracts.ts
      repository.ts
      service.ts
    admin/
      reports/
      users/
```

## 2) 핵심 원칙
- `app/api/**/route.ts`는 얇게 유지: 파싱/인증/상태코드/서비스 호출만 수행
- Prisma 직접 호출은 `repository.ts`로 이동
- 비즈니스 규칙은 `service.ts`에만 둠
- 요청/응답 타입은 `contracts.ts`로 분리
- 신규 기능은 기존 `lib/*` 직접 확장 금지, 반드시 `server/domain/*`로 추가

## 3) 단계별 실행 계획

### Phase A: Auth 도메인 완전 전환 (첫 스프린트)
- 대상 라우트:
  - `app/api/auth/login/route.ts`
  - `app/api/auth/logout/route.ts`
  - `app/api/auth/me/route.ts`
  - `app/api/auth/bootstrap/route.ts`
- 작업:
  - `server/domain/auth/{contracts,repository,service,mapper}.ts` 생성
  - 각 라우트에서 로직 제거 후 service 호출로 치환
  - 기존 테스트 유지 + 부족 테스트 보강

### Phase B: Wordbook 쿼리/커맨드 분리
- 대상:
  - `app/api/wordbooks/**`
- 작업:
  - `wordbookQueryService`, `wordbookCommandService`로 유스케이스 분리
  - 마켓/리뷰/신고/차단을 하위 모듈화

### Phase C: Quiz/Study 도메인 분리
- 대상:
  - `app/api/wordbooks/[id]/quiz*`
  - `app/api/quiz/submit`
- 작업:
  - 채점/오답큐/진행률 규칙을 service로 이동
  - 모드(meaning/word)별 책임 분리

### Phase D: Payments/Admin/Internal 정리
- 대상:
  - `app/api/payments/*`
  - `app/api/admin/*`
  - `app/api/internal/cron/*`
- 작업:
  - 외부 SDK/운영 크론 로직을 infra+service로 분리

### Phase E: 프론트 API 호출 일원화
- 대상:
  - `lib/clientApi.ts`
  - direct fetch 사용 컴포넌트
- 작업:
  - API 호출을 공통 클라이언트 경유로 통합
  - 컴포넌트 내 직접 fetch 제거

## 4) 게이트(각 단계 공통)
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run hooks:validate`
- 변경 범위가 API에 걸리면 `npm run test:e2e:local:smoke`까지 권장

## 5) 리스크와 대응
- 리스크: 구조 이동 중 회귀
  - 대응: 라우트 계약 테스트 먼저 고정 후 내부 이동
- 리스크: 한 PR이 너무 커짐
  - 대응: 도메인 단위 PR (최대 1도메인 + 1횡단 관심사)
- 리스크: 구/신 구조 혼용 장기화
  - 대응: "신규 기능은 신구조만" 규칙 강제

## 6) 새 세션 시작 지침
새 세션에서는 아래 순서로 시작:
1. `docs/ai-operating-system-2026-02-22/21-folder-structure-refactor-checklist.md` 확인
2. `CURRENT_FOCUS` 섹션의 미완료 항목 1개 선택
3. 선택 항목만 구현 -> 게이트 통과 -> 체크박스 갱신
