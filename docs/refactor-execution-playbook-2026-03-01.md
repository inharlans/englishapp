# 리팩터링 실행 플레이북 (2026-03-01)

## 목적
- 구조 개선을 **작게, 안전하게, 되돌리기 쉽게** 적용한다.
- 인코딩/인증/계층 경계/성능 작업의 회귀 원인을 PR 단위로 분리해 추적 가능하게 만든다.

## PR 전략 (수정본)

### PR-1A: Encoding Guardrail 선반영
**목표**
- BOM 재유입 방지와 line ending 드리프트 방지 정책을 먼저 고정한다.

**변경 후보 파일**
- `.gitattributes`
- `scripts/ops/validate-text-encoding.js`
- `.githooks/pre-commit`
- `.github/workflows/ci.yml`
- `README.md` (개발자 안내 섹션)

**작업 체크리스트**
- [ ] UTF-8 BOM 탐지 규칙을 검증 스크립트에 추가한다.
- [ ] 실패 시 파일 목록 + 수정 가이드를 출력한다.
- [ ] pre-commit에서 동일 검사를 실행한다.
- [ ] CI에서도 동일 검사를 실행한다.
- [ ] `.gitattributes`에 텍스트 EOL 정책을 명시한다.

**검증**
- `npm run hooks:validate`
- `npm run codex:workflow:check`

**완료 기준**
- 새 BOM 파일이 커밋/CI에서 모두 차단된다.
- EOL이 의도치 않게 대량 변경되지 않는다.

---

### PR-1B: BOM 제거 전용 PR
**목표**
- 코드 로직 변경 없이 BOM만 제거한다.

**작업 원칙**
- 인코딩 변경 외 로직 수정 금지
- 디렉터리 단위로 분할 PR (충돌 최소화)

**권장 분할 순서**
1. `app/`
2. `components/`
3. `lib/`
4. `server/` + `docs/`

**검증**
- `npm run hooks:validate`
- `npm run build`

**완료 기준**
- BOM 파일 0건
- 기능 회귀 없음 (스모크 기준)

---

### PR-2A: 인증/응답 표준화
**목표**
- 라우트별 에러/응답 포맷 차이를 줄이고, 클라이언트가 `message` 대신 `code`에 의존하도록 표준화한다.

**응답 스키마 (고정 계약)**
```json
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "인증이 필요합니다.",
    "details": {}
  }
}
```

**정책**
- `code`: 안정 필드 (클라이언트 분기 기준)
- `message`: 비안정 필드 (표시용)
- `details`: 디버깅/확장용 선택 필드

**변경 후보 파일**
- `lib/api/service-response.ts`
- `lib/api/mutation-route.ts`
- `lib/api/metric-response.ts`
- `app/api/auth/login/route.ts`
- `app/api/wordbooks/route.ts`
- `app/api/blocked-owners/route.ts`

**작업 체크리스트**
- [ ] 공통 에러 빌더 도입 (`code/status/message` 매핑)
- [ ] 인증 실패 응답을 공통 코드로 통일
- [ ] 로그/메트릭 경로에서 민감정보 마스킹 적용
- [ ] 문자열 비교 기반 클라이언트 분기 제거 계획 문서화

**검증**
- `npm run test`
- `npm run typecheck`
- `npm run codex:workflow:check`

**완료 기준**
- 핵심 API의 에러 응답 구조가 일관됨
- 기존 UX 문자열은 가능한 범위에서 유지

---

### PR-2B: API Prisma 접근 축소 (도메인 경유)
**목표**
- `app/api`가 Prisma를 직접 다루지 않도록 경계 정리.

**경계 계약**
- Route: 입력 파싱/검증 + auth + 도메인 호출 + 응답 매핑
- Domain Service (Use case): 권한/비즈니스/트랜잭션
- Repository: Prisma 캡슐화

**우선 대상 라우트**
- `app/api/words/route.ts`
- `app/api/words/import/route.ts`
- `app/api/words/[id]/route.ts`
- `app/api/users/me/daily-goal/route.ts`
- `app/api/blocked-owners/route.ts`

**추가 생성 후보**
- `server/domain/words/service.ts`
- `server/domain/words/repository.ts`
- `server/domain/words/contracts.ts`

**검증**
- `npm run test`
- `npm run lint`
- `npm run typecheck`
- `npm run codex:workflow:check`

**완료 기준**
- 우선 대상 라우트에서 `@/lib/prisma` 직접 import 제거

---

### PR-3: 페이지 계층 경계 정리
**목표**
- `app/*.tsx` 서버 페이지의 직접 Prisma 접근을 Query Service로 분리.

**우선 대상 페이지**
- `app/wordbooks/page.tsx`
- `app/wordbooks/market/page.tsx`
- `app/wordbooks/blocked/page.tsx`
- `app/wordbooks/[id]/page.tsx`
- `app/admin/page.tsx`

**검증**
- `npm run typecheck`
- `npm run build`
- `npm run codex:workflow:check`

**완료 기준**
- 대상 페이지에서 `@/lib/prisma` import 제거

---

### PR-4: 레거시 격리 + 폐기 정책
**목표**
- 레거시 엔드포인트/페이지를 명시적으로 격리하고, 폐기 전 관측 기반으로 전환한다.

**정책표 필수 항목**
- 대상 경로
- 대체 경로
- 처리 방식 (`200 + deprecation`, `301`, `302`)
- 유지 기간
- 제거 예정일
- fallback 문서 URL

**대상 예시**
- `app/api/quiz/submit/route.ts`
- `app/api/words/**`
- `app/quiz-word/page.tsx`
- `app/quiz-meaning/page.tsx`
- `app/list-correct/page.tsx`
- `app/list-wrong/page.tsx`
- `app/list-half/page.tsx`

**완료 기준**
- 레거시 호출량을 추적 가능한 형태로 기록
- 제거 일정 합의 전까지 호환 정책 유지

---

### PR-5: 성능 최적화 (지표 기반)
**공통 원칙**
- 구현 전 KPI 정의, 구현 후 동일 조건으로 측정
- SQL/로직 변경 전 golden test 먼저 작성

#### P2-1 마켓 조회
- KPI 예시: p95 `<= 300ms`
- 대상: `server/domain/wordbook/service.ts`, `server/domain/wordbook/repository.ts`

#### P2-2 퀴즈 랜덤 선택
- KPI 예시: p95 `<= 200ms`
- 대상: `server/domain/quiz/repository.ts`

#### P2-3 단어 import
- KPI 예시: 1k rows 처리시간 `50% 이상 개선`
- 대상: `app/api/words/import/route.ts` 또는 도메인 이관 후 `server/domain/words/*`

**완료 기준**
- 성능 지표와 쿼리 플랜 비교 결과가 PR 설명에 포함됨

## 추가 게이트

### 인증/권한 변경 PR
- 역할 매트릭스 테스트를 포함한다.
  - 비로그인
  - 일반 사용자
  - 관리자
  - 소유자
  - 다운로드 사용자

### 쿼리/성능 변경 PR
- 최소 1회 `EXPLAIN (ANALYZE)` 결과를 첨부한다.
- 동일 데이터 조건에서 전/후 비교를 남긴다.

## 운영 규칙
- PR 하나에는 한 가지 리스크 축만 넣는다.
- 대량 변경 PR은 반드시 로직 변경 PR과 분리한다.
- 롤백 경로(되돌릴 커밋 단위)를 PR 본문에 명시한다.
