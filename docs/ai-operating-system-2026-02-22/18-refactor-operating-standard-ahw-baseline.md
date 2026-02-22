# Englishapp 리팩터링 운영표준 (AHW Baseline)

Date: 2026-02-22  
Baseline Repo: `https://github.com/chacha95/advanced-harness-window`  
Baseline Scope: `backend/`, `frontend/`

## 1. 목적
- AI/사람 모두가 같은 방식으로 수정 가능한 코드베이스를 만든다.
- 기능 추가 시 "기존 패턴 복제"가 가능한 구조를 강제한다.
- 라우트/도메인/데이터 접근/검증/에러 처리의 규칙을 고정한다.

## 2. 기준 코드베이스에서 채택할 핵심 규칙

### 2.1 도메인 경계 우선 (DDD)
- 기준 근거:
  - `C:\dev\_tmp_advanced_harness_window\backend\backend\domain\user\model.py`
  - `C:\dev\_tmp_advanced_harness_window\backend\backend\domain\user\repository.py`
  - `C:\dev\_tmp_advanced_harness_window\backend\backend\domain\user\service.py`
- 규칙:
  - 기능 단위가 아니라 비즈니스 도메인 단위로 묶는다.
  - 도메인마다 최소 `model/repository/service` 계층을 둔다.
  - API 라우트는 도메인 서비스 호출만 담당하고 로직을 직접 담지 않는다.

### 2.2 API 계층의 얇은 라우터
- 기준 근거:
  - `C:\dev\_tmp_advanced_harness_window\backend\backend\api\v1\routers\auth.py`
- 규칙:
  - `route.ts`는 인증/입력 파싱/권한 체크/응답 매핑까지만 수행한다.
  - 도메인 규칙, 트랜잭션, 복합 쿼리 로직은 서비스/리포지토리로 이동한다.

### 2.3 설정/보안/환경의 중앙화
- 기준 근거:
  - `C:\dev\_tmp_advanced_harness_window\backend\backend\core\config.py`
  - `C:\dev\_tmp_advanced_harness_window\backend\backend\main.py`
- 규칙:
  - 환경변수 해석/기본값/보안 토글은 단일 설정 모듈에서 관리한다.
  - 운영/개발 분기 로직은 상수화하고 라우트 파일에서 직접 분기하지 않는다.

### 2.4 데이터 접근 추상화
- 기준 근거:
  - `C:\dev\_tmp_advanced_harness_window\backend\backend\db\orm.py`
  - `C:\dev\_tmp_advanced_harness_window\backend\backend\domain\shared\base_repository.py`
- 규칙:
  - Prisma 직접 호출은 도메인 리포지토리 레이어로 모은다.
  - 읽기/쓰기 책임을 분리 가능한 구조로 유지한다.
  - 트랜잭션 경계는 서비스 레이어에서 명시한다.

### 2.5 DTO/스키마 계약 고정
- 기준 근거:
  - `C:\dev\_tmp_advanced_harness_window\backend\backend\dtos\auth.py`
- 규칙:
  - 요청/응답 타입을 라우트 외부(`contracts`/`dto`)에 분리한다.
  - API 계약 변경 시 타입 + 테스트 + 문서를 동시에 갱신한다.

### 2.6 프론트엔드 API 클라이언트 일원화
- 기준 근거:
  - `C:\dev\_tmp_advanced_harness_window\frontend\src\lib\api.ts`
- 규칙:
  - API 호출, 토큰 갱신, 공통 에러 처리를 단일 클라이언트에서 수행한다.
  - 화면 컴포넌트는 fetch 직접 호출을 금지하고 도메인 API 함수만 사용한다.

### 2.7 앱 엔트리/미들웨어 표준화
- 기준 근거:
  - `C:\dev\_tmp_advanced_harness_window\frontend\src\app\layout.tsx`
  - `C:\dev\_tmp_advanced_harness_window\frontend\src\middleware.ts`
- 규칙:
  - 전역 Provider/메타/폰트/에러 경계를 `app/layout.tsx`에서 통합 관리한다.
  - 인증 리다이렉트/경로 보호 정책은 `middleware.ts` 단일 지점에서 유지한다.

## 3. Englishapp 대상 아키텍처 목표

## 3.1 Target 구조 (점진적 전환)
```text
app/
  api/
    <domain>/.../route.ts            # 얇은 라우터
server/
  core/
    config.ts                        # 환경/설정
    errors.ts                        # 공통 에러 타입
  contracts/
    <domain>.ts                      # 요청/응답 계약
  domain/
    <domain>/
      model.ts                       # 도메인 모델/타입
      repository.ts                  # Prisma 접근 캡슐화
      service.ts                     # 비즈니스 규칙
  infra/
    prisma.ts                        # DB/infra adapter
    auth.ts                          # auth adapter
```

## 3.2 현행 구조와 매핑
- 현행 강점:
  - `lib/requestSecurity.ts`, `lib/authServer.ts`, `lib/observability.ts` 등 공통화가 이미 존재
  - 테스트/검증 파이프라인(`mcp:cycle`, vitest, e2e)이 존재
- 현행 갭:
  - `app/api/*/route.ts`에 도메인 로직이 섞인 구간 존재
  - 도메인 단위 계층(`repository/service/contracts`) 표준 부재
  - 프론트 호출 레이어(`lib/clientApi.ts`)와 화면 fetch 패턴의 일관성 부족

## 4. 네이밍/경계 표준
- 도메인 명은 비즈니스 용어 그대로 사용:
  - `auth`, `wordbook`, `quiz`, `payments`, `admin-report`, `admin-user`
- 금지:
  - `utils2`, `serviceHelper`, `commonLogic`, `misc` 같은 목적 불명 네이밍
- 파일 책임:
  - `route.ts`: HTTP 입출력/권한/상태코드
  - `service.ts`: 도메인 규칙/유스케이스
  - `repository.ts`: Prisma query + persistence mapping
  - `contracts/*.ts`: API 계약 타입

## 5. 라우트 구현 표준
- 라우트 공통 처리 순서:
  1. 요청 파싱/유효성 검사
  2. 인증/권한 검사
  3. 서비스 호출
  4. 응답 DTO 매핑
  5. 관측성(메트릭/에러 캡처)
- 한 라우트 파일에서 허용:
  - 경량 validation schema
  - 단일 서비스 호출
  - 응답 변환
- 한 라우트 파일에서 금지:
  - 복합 비즈니스 규칙 처리
  - 복수 테이블 조합 로직
  - 직접 Prisma 접근

## 6. 테스트 표준
- 최소 단위:
  - `service` 단위 테스트
  - `route` 계약 테스트(상태코드 + 응답 구조)
- 권장:
  - 권한 경계 테스트(401/403)
  - CSRF/보안 경계 테스트
  - 핵심 유스케이스 e2e smoke
- 변경 승인 조건:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run hooks:validate`

## 7. AI 작업 표준 (영상 실행 방식 반영)
- 프롬프트에서 도메인 명시:
  - "wordbook 도메인의 service/repository 패턴으로 구현"
- 편집 단위 제한:
  - 한 번에 1도메인 또는 1유스케이스만 수정
- 훅 체인 사용:
  - 계획: `planner` -> `plan-reviewer`
  - 인증 라우트: `auth-route-debugger` -> `auth-route-tester`
  - 문서화: `documentation-architect`

## 8. 전환 원칙
- Big-bang 금지, 도메인별 점진 전환
- 라우트 동작/응답 계약을 먼저 고정한 뒤 내부 구조를 이동
- "파일 이동 먼저"가 아니라 "계약-테스트-리팩터링" 순서 준수

## 9. Definition of Done
- 도메인별 DoD:
  - route/service/repository/contracts 분리 완료
  - 기존 API 계약 불변 또는 명시적 버전 업
  - 테스트(단위+통합) 추가 및 통과
  - 운영 문서 업데이트
- 프로그램 DoD:
  - 핵심 도메인(`auth`, `wordbook`, `quiz`, `payments`, `admin`) 전환 완료
  - 신규 기능은 구 구조에 추가되지 않음(신규는 반드시 target 구조)
