# Englishapp (English 1500 + 단어장 마켓)

Next.js(App Router) + Prisma + PostgreSQL 기반 단어 학습 웹앱.

- 고정 단어 리스트(`words.tsv`) 기반 “English 1500” 학습(암기/퀴즈/오답 복습)
- 유저 개인 단어장(생성/편집)
- 공개 단어장 마켓(다운로드/평점/정렬)
- 오프라인 저장(IndexedDB) + 최소 Service Worker 캐싱
- FREE/PRO 플랜 정책을 **서버에서 강제**

## 제품 규칙(현재)

- 단어장에는 `ownerId`(소유자)가 있고, **소유자만** 단어장 메타/항목을 수정할 수 있다.
- 다운로드한 단어장은 **읽기 전용**이며, 다운로더는 내용을 수정하거나 재배포(업로드)할 수 없다.
- 학습 플로우는 단어장 내부 경로(`/wordbooks/[id]/memorize`, `/quiz-meaning`, `/quiz-word`, `/list-*`)에서만 제공한다.
- 단, 다운로드한 단어장의 원본 텍스트는 바뀌지 않으며(뜻 저장/수정 금지), 학습 상태(정답/오답/진도)만 사용자별로 저장된다.
- 마켓은 단어장별 `downloadCount`, `ratingAvg`, `ratingCount`를 표시하며 기본 정렬은 “Top(평점/평가수/다운로드/최신)”이다.

플랜 정책(서버 강제)
- FREE
- 공개 단어장 다운로드 **평생 3회 제한**
- 단어장 생성 **평생 1개 제한**
- 업로드(내가 만든) 단어장은 **강제 공개**
- PRO
- 다운로드 **무제한**
- 단어장 생성 **무제한**
- 업로드 단어장 공개/비공개 선택 가능

가격(표시용, 결제 연동은 아직 없음)
- PRO 월: 2,900원
- PRO 연: 29,000원

## 페이지(웹)

- `/` 홈
- `/memorize`, `/quiz-meaning`, `/quiz-word`, `/list-*`는 `/wordbooks`로 리다이렉트
- 실제 학습 화면:
  - `/wordbooks/[id]/memorize`
  - `/wordbooks/[id]/quiz-meaning`, `/wordbooks/[id]/quiz-word`
  - `/wordbooks/[id]/list-correct`, `/wordbooks/[id]/list-wrong`, `/wordbooks/[id]/list-half`
- `/wordbooks` 내 라이브러리(내가 만든 단어장 + 다운로드한 단어장)
- `/wordbooks/new` 단어장 생성
- `/wordbooks/[id]` 단어장 상세(소유자 편집, 다운로드본은 읽기 전용)
- `/wordbooks/market` 공개 단어장 마켓(검색/정렬/다운로드)
- `/offline` 오프라인 라이브러리(IndexedDB)
- `/offline/wordbooks/[id]` 오프라인 학습(카드)
- `/pricing` 요금/업그레이드 안내
- `/admin` 관리자 콘솔(`isAdmin` 필요)
- `/login`, `/logout` 로그인/로그아웃

참고: 기본적으로 대부분의 페이지/API는 로그인 필요하며, 예외로 `/login`, `/offline`, `/sw.js`, `/api/auth/*` 등은 공개 경로로 처리되어 있다(`middleware.ts`).

## API(App Router route)

인증(Auth)
- `POST /api/auth/bootstrap` 최초 관리자 생성(1회성, `AUTH_BOOTSTRAP_TOKEN` 헤더 필요)
- `POST /api/auth/login` 로그인(쿠키 세팅)
- `POST /api/auth/logout` 로그아웃(쿠키 삭제)
- `GET /api/auth/me` 현재 사용자 + 플랜/사용량 정보

English 1500(고정 단어 리스트)
- `GET /api/words` 암기/퀴즈/리스트용 메인 API
- `GET /api/words/[id]` 단어 상세
- `POST /api/words/import` 단어 import(내부 용도)

단어장(Wordbooks)
- `GET /api/wordbooks` 내가 만든 단어장 목록
- `POST /api/wordbooks` 단어장 생성(FREE는 강제 공개)
  - FREE는 생성 1회(평생) 제한, PRO는 무제한
- `GET /api/wordbooks/[id]` 단어장 + 아이템 조회(소유자만 private 조회 가능, 타인은 public만)
- `PATCH /api/wordbooks/[id]` 단어장 메타 수정(소유자만)
- `DELETE /api/wordbooks/[id]` 단어장 삭제(소유자만)
- `POST /api/wordbooks/[id]/items` 아이템 추가(소유자만)
- `PATCH /api/wordbooks/[id]/items/[itemId]` 아이템 수정(소유자만)
- `DELETE /api/wordbooks/[id]/items/[itemId]` 아이템 삭제(소유자만)
- `POST /api/wordbooks/[id]/publish` 공개/비공개 토글(PRO만, FREE는 비공개 금지)
- `GET /api/wordbooks/market` 마켓 목록(검색/정렬/페이지네이션)
- `POST /api/wordbooks/[id]/download` 단어장 다운로드(유저당 1회 기록 + `downloadCount` 증가, 플랜 제한 강제)
- `POST /api/wordbooks/[id]/rate` 1~5점 평점(소유자 또는 다운로드한 유저만 가능, 1인 1회 upsert + 평균/개수 집계)
  - `review`(댓글) 필드 함께 저장 가능
- `GET /api/wordbooks/[id]/reviews` 해당 단어장 리뷰 목록(평점 + 댓글 + 작성자 마스킹 이메일)
- `GET /api/wordbooks/downloaded` 내가 다운로드한 단어장 목록
- `GET /api/wordbooks/[id]/study` 다운로드 단어장 학습 상태/아이템 조회(사용자 스코프)
- `POST /api/wordbooks/[id]/study/items/[itemId]` 다운로드 단어장 아이템 정오답/리셋 반영(사용자 스코프)
- `GET /api/wordbooks/[id]/quiz` 다운로드 단어장 퀴즈 문제 로드(의미/단어 모드)
  - `partSize`, `partIndex` 쿼리로 part 범위 출제 가능
- `POST /api/wordbooks/[id]/quiz/submit` 다운로드 단어장 퀴즈 채점/상태 반영(사용자 스코프)
- `POST /api/wordbooks/[id]/sync-download` 다운로드 단어장 최신 버전 동기화(학습상태 유지/초기화 선택)

관리자(Admin)
- `GET /api/admin/users` 유저 목록(관리자만)
- `POST /api/admin/users/[id]/plan` `plan`, `proUntil`, `isAdmin` 설정(관리자만)

## 오프라인(Offline)

- “Save Offline”은 단어장 아이템을 브라우저 IndexedDB에 저장한다.
- 저장 로직: `lib/offlineWordbooks.ts`
- 라이브러리 UI: `/offline`
- 오프라인 학습 UI: `/offline/wordbooks/[id]`
- 최소 Service Worker: `public/sw.js`
- `/offline` 및 Next 정적 리소스를 best-effort 캐싱

## 데이터 모델(Prisma)

- English 1500 학습 데이터: `Word`, `Progress`, `ResultState`, `QuizProgress`
- 사용자/플랜: `User(plan, proUntil, isAdmin)` + `UserPlan` enum
- 단어장: `Wordbook`, `WordbookItem`, `WordbookDownload`, `WordbookRating`

## 로컬 개발

1. `.env.example`을 `.env`로 복사
2. `DATABASE_URL`을 로컬 PostgreSQL 접속 문자열로 설정
3. 실행

```bash
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## Recent Update (2026-02-16)

- Applied a global 2-color design system with tokens in `app/globals.css`:
  - Primary blue: `#2563EB`
  - Accent orange: `#F59E0B`
  - Neutrals: background/card/border/text tokens
- Standardized shared UI classes:
  - `ui-btn-primary`, `ui-btn-accent`, `ui-btn-secondary`, `ui-btn-ghost`
  - `ui-tab-active`, `ui-tab-inactive`
- Refactored key pages/components to use token-based buttons/tabs without layout changes:
  - Navbar, wordbook tabs, density toggle, wordbook library, market, pricing, login, offline, and study/quiz surfaces.
- Enforced CTA mapping:
  - Main CTA buttons use orange only where intended (e.g. download CTA, recommended pricing badge context).
  - Active/selected and navigation emphasis use blue.
- Fixed broken JSX/string issues introduced during prior style churn:
  - `app/wordbooks/[id]/quiz/quizClient.tsx`
  - `app/wordbooks/market/page.tsx`
  - `app/wordbooks/[id]/page.tsx`
  - `components/wordbooks/RateBox.tsx`
- Validation:
  - `npm run typecheck` passed
  - `npm run build` passed

## Railway 배포(권장)

이 저장소에는 `railway.json`이 포함되어 있고, 서버 시작 전에 마이그레이션을 실행한다.

필수 환경변수
- `DATABASE_URL` (Railway PostgreSQL 또는 외부 PostgreSQL)
- `GOOGLE_TRANSLATE_API_KEY` (선택)
- `AUTH_SECRET` (필수, 32자 이상 권장)
- `AUTH_BOOTSTRAP_TOKEN` (필수: 최초 사용자 생성용 bootstrap API 보호)
- `CRON_SECRET` (선택: 내부 크론 API 인증 토큰)
- `UPSTASH_REDIS_REST_URL` (선택: 분산 rate limit)
- `UPSTASH_REDIS_REST_TOKEN` (선택: 분산 rate limit)

프로덕션 rate limiting
- Upstash 환경변수가 있으면 Redis를 사용(분산)
- 없으면 PostgreSQL fallback(분산)

배포 흐름
1. GitHub에 push
2. Railway: `New Project -> Deploy from GitHub Repo`
3. Railway PostgreSQL 추가
4. 웹 서비스에 `DATABASE_URL` 설정
5. 배포 URL 접속

## Prisma 스크립트

- `npm run prisma:generate` Prisma Client 생성
- `npm run prisma:migrate` 로컬 개발용 마이그레이션
- `npm run prisma:deploy` 프로덕션 마이그레이션(`migrate deploy`)
- `npm run typecheck` 실행 시 `next typegen`을 먼저 수행해 `.next/types` 누락으로 인한 TS6053 오류를 예방

## Railway 시작 커맨드

```bash
npm run start:railway
```

이 커맨드는 다음을 수행한다.
1. `prisma generate`
2. `prisma migrate deploy`
3. `next start -p $PORT`

초기 데이터가 필요할 때만 시드 포함 시작 커맨드를 사용한다.

```bash
npm run start:railway:seed
```

## 인증 bootstrap(최초 관리자)

1. `AUTH_BOOTSTRAP_TOKEN`, `AUTH_SECRET` 환경변수 설정
2. `POST /api/auth/bootstrap` 호출

```json
{ "email": "admin@example.com", "password": "change-me-now" }
```

이후 `/login`으로 로그인한다.

## 지금까지 구현된 것(체크리스트)

- [x] Next.js(App Router) 기본 앱 + Tailwind UI
- [x] JWT 쿠키 인증 + bootstrap(최초 관리자 생성) 플로우
- [x] English 1500 학습: 암기/퀴즈/정답·오답·회복 리스트 + 복습 스케줄링
- [x] Rate limiting(Upstash 설정 시 Redis, 미설정 시 DB fallback)
- [x] 개인 단어장: 생성/수정/삭제(소유자만), 아이템 CRUD, 벌크 추가
- [x] 마켓: 공개 단어장 탐색(검색/정렬/페이지네이션), 다운로드/평점 지표 표시
- [x] 다운로드: 유저당 1회 다운로드 기록 + 단어장 `downloadCount` 증가
- [x] 평점: 유저당 1회(upsert), 서버에서 평균/개수 집계하여 단어장에 반영
- [x] 오프라인: IndexedDB 저장/목록/삭제 + 오프라인 카드 학습 페이지
- [x] 최소 Service Worker 캐싱(`/offline`, Next 정적 리소스)
- [x] 발음(TTS): 브라우저 `SpeechSynthesis` 기반 “Speak” 버튼
- [x] 플랜 정책(서버 강제)
- [x] FREE: 공개 단어장 다운로드 평생 3회
- [x] FREE: 업로드 단어장 강제 공개, 비공개 불가
- [x] PRO: 다운로드 무제한, 공개/비공개 토글 가능
- [x] 요금 안내 페이지(`/pricing`) 추가(표시용)
- [x] 관리자 콘솔(`/admin`) + 플랜/관리자 권한 설정 API
- [x] 단어장 내부 전용 학습 라우트 적용: `/wordbooks/[id]/memorize|quiz|list-*`
- [x] 다운로드 단어장 read-only 보장(뜻 저장/수정 비활성) + 사용자별 학습 상태 저장
- [x] `(명)(동)(형)` 형태 의미 표시 개선(품사 태그 가독성 강화)
- [x] 홈/네비/전역 폰트 및 레이아웃 리디자인
- [x] UI E2E 플로우 안정화(학습 버튼 존재 여부에 따른 분기 처리)
- [x] 다운로드 직후 온보딩 배너(암기/퀴즈 즉시 진입 CTA + 24시간 재노출 제한)
- [x] 학습 화면 공통 스터디 탭 + 마지막 학습 탭 복원 버튼
- [x] 의미 표시 `간결/자세히` 모드 토글(로컬 저장) + 품사 태그 가독성 개선
- [x] 다운로드 단어장 버전 추적(`contentVersion`) + 변경 요약(+/~/-) + 수동 동기화
- [x] 세션 회고 패널(다음 행동 추천, 예상 소요시간, 루틴 알림 토글)

## 현재 미완료 TODO (단일 목록)

아래 3개가 현재 기준 단일 TODO이며, 이 외 섹션은 이력/기록용입니다.

- [ ] 결제 연동(월/연 구독) + 자동 플랜 활성화/만료 처리
- [ ] OAuth 로그인(구글/네이버/카카오) + 계정 연결
- [ ] 관측성 스택 추가(구조화 로그, 에러 추적, 라우트별 4xx/5xx/지연 대시보드)

## Bootstrap + Login 예시

PowerShell(로컬 개발):

```powershell
$base = "http://127.0.0.1:3000"
$bootstrapToken = $env:AUTH_BOOTSTRAP_TOKEN

Invoke-RestMethod -Method Post "$base/api/auth/bootstrap" `
  -Headers @{ "x-bootstrap-token" = $bootstrapToken } `
  -ContentType "application/json" `
  -Body (@{ email="admin@example.com"; password="change-me-now-123" } | ConvertTo-Json)

# Login (cookie를 세션 변수에 저장)
$sess = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-WebRequest -Method Post "$base/api/auth/login" -WebSession $sess `
  -ContentType "application/json" `
  -Body (@{ email="admin@example.com"; password="change-me-now-123" } | ConvertTo-Json) | Out-Null

# 보호된 API 호출
Invoke-RestMethod -Method Get "$base/api/words?mode=memorize&batch=1&page=0&hideCorrect=true&week=1" -WebSession $sess

# Logout
Invoke-WebRequest -Method Post "$base/api/auth/logout" -WebSession $sess | Out-Null
```

cURL(프로덕션):

```bash
BASE="https://your-app.example.com"
BOOTSTRAP_TOKEN="$AUTH_BOOTSTRAP_TOKEN"

curl -sS -X POST "$BASE/api/auth/bootstrap" \
  -H "x-bootstrap-token: $BOOTSTRAP_TOKEN" \
  -H "content-type: application/json" \
  -d '{"email":"admin@example.com","password":"change-me-now-123"}'

curl -i -c cookies.txt -X POST "$BASE/api/auth/login" \
  -H "content-type: application/json" \
  -d '{"email":"admin@example.com","password":"change-me-now-123"}'

curl -sS -b cookies.txt "$BASE/api/words?mode=memorize&batch=1&page=0&hideCorrect=true&week=1"

curl -sS -b cookies.txt -X POST "$BASE/api/auth/logout"
```

## Dataset / Wordbooks (Generated)

This repo can generate multiple **en+ko** wordbooks where `ko` is filled in the `(명)(동)...` style.
These are built from open wordlists (NGSL Project) and Korean translations from Kaikki/Wiktionary.

Commands (from `C:\\dev\\englishapp`):

```powershell
# Crawl open wordlists (NGSL family + NDL + MOEL file)
node .\\scripts\\crawl-ngsl-family.mjs

# Generate many fully-filled KO wordbooks (no blank ko rows kept)
node .\\scripts\\generate-many-wordbooks-ko.mjs --chunk 300 --max 2100 --concurrency 6

# Build derived "school level" sets (초등/중등/고등/수능/토익/회화/비즈니스/전문)
node .\\scripts\\build-derived-level-wordbooks.mjs

# Validate outputs (optional)
node .\\scripts\\validate-wordbooks-ko.mjs

# Generate a root TSV for seeding (does not overwrite words.tsv)
node .\\scripts\\generate-root-words-tsv-ko.mjs --count 1500
```

Outputs:
- `data/wordbooks-ko/**.generated.tsv`
- `words.ko.generated.tsv`

## 2026-02-16 Update

- Study state is now **user-scoped** for all quiz/memorize flows.
- `Progress`, `ResultState`, and `QuizProgress` are keyed by `(userId, wordId)`.
- `/api/words` now returns `isUserScoped: true` for debugging/verification.
- Seed process now imports generated wordbooks from `data/wordbooks-ko/**/*.generated.tsv`
  into public market wordbooks (download-ready).

## 2026-02-16 TODO Sprint (No External Keys)

Done in this sprint:

- [x] Downloaded wordbook personal study state (check/wrong/progress) saved per user.
- [x] Market ranking improvement (Bayesian rating + download + recency score).
- [x] Report/block/moderation flow for public wordbooks.
- [x] Wordbook import/export (TSV/CSV) with optional pronunciation auto-fill.
- [x] Sentence/example fields + wordbook-based quiz mode.
- [x] PWA install prompt + stronger route-level offline caching strategy.

아직 남은 항목(외부 연동 키 필요, 단일 TODO 목록과 동일):

- 결제 연동(구독 결제) + 플랜 자동 활성화/만료 처리
- OAuth 로그인(구글/네이버/카카오) + 계정 연결

## 2026-02-16 보강 업데이트

- 보안 강화:
  - 주요 쓰기 API에 mutation 요청 신뢰성 체크(`Origin` / `sec-fetch-site`) 추가
  - 신고/차단/import/학습/퀴즈 제출 경로 rate limit 강화
  - `middleware.ts`에 보안 응답 헤더 추가:
    - `X-Frame-Options: DENY`
    - `X-Content-Type-Options: nosniff`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- 랭킹 안정화:
  - `Wordbook.rankScore`, `Wordbook.rankScoreUpdatedAt` 추가
  - 마켓 `Top` 정렬을 영속화된 `rankScore` 기반(DB 정렬)으로 변경
  - 다운로드/평점 반영 시 랭킹 점수 자동 갱신
  - 수동 재계산 명령 추가:
    - `npm run wordbooks:recompute-rank`
- E2E 스모크 테스트:
  - HTTP 기반 end-to-end 스모크 테스트 스크립트 추가:
    - `npm run test:e2e`
    - `npm run test:e2e:ui` (Playwright UI 플로우)
    - `npm run test:e2e:local` (dev 서버 자동 실행 + smoke + ui 일괄)
    - `npm run test:e2e:local:smoke` (dev 서버 자동 실행 + smoke)
    - `npm run test:e2e:local:ui` (dev 서버 자동 실행 + ui)
  - 환경 변수:
    - `E2E_BASE_URL` (default: `http://127.0.0.1:3000`)
    - `E2E_EMAIL` (default: `admin@example.com`)
    - `E2E_PASSWORD` (default: `change-me-now-123`)
    - `AUTH_BOOTSTRAP_TOKEN` (bootstrap 단계에서 선택 사용)

## TODO 재정리 (2026-02-16)

기존 TODO 기준 진행 현황:

- [x] 다운로드 단어장 개인 학습 상태 저장
- [x] 마켓 랭킹 개선
- [x] 신고/차단/모더레이션 도구
- [x] 단어장 import/export + 선택적 발음 자동 채움
- [x] 예문/문장 기능 + 단어장 퀴즈 모드
- [x] PWA 설치 UX + 오프라인 캐싱 강화
- 결제 연동 + 플랜 자동 라이프사이클 (미완료, 상단 단일 TODO 참조)
- OAuth 로그인 + 계정 연결 (미완료, 상단 단일 TODO 참조)

신규 백로그(직접 서버 점검 및 분석 기반):

- [x] 레거시 페이지/문서에 남아있는 한글 인코딩 깨짐(모지바케) 정리
- [x] 모든 쓰기 API에 `zod`(또는 동급) 스키마 검증 적용
- [x] 현재 Origin 체크 외 CSRF 토큰(더블 서브밋) 추가
- [x] 차단 해제 UI(`BlockedOwner` 관리 화면) 추가
- [x] 모더레이션 감사 로그 필드 강화(처리 전/후 상태, 사유 코드, 처리자 IP 해시)
- [x] 신고 악용 방지(쿨다운, 중복 신고 억제, 신고자 신뢰 점수)
- [x] E2E를 HTTP 스모크에서 UI 플로우 테스트까지 확장
  - 로그인 -> 마켓 -> 다운로드 -> 학습 -> 퀴즈 -> 신고 -> 모더레이션
- [x] CI 파이프라인에 `typecheck + test + test:e2e` 고정
- [x] 랭킹 유지보수 작업 스케줄링(일 단위 재계산 + 점수 드리프트 모니터링)
- 관측성 스택 추가(구조화 로그, 에러 추적, 라우트별 4xx/5xx/지연 대시보드) (미완료, 상단 단일 TODO 참조)
- [x] DB 백업/복구 런북 및 마이그레이션 롤백 플레이북 추가
- [x] 접근성/모바일 QA 패스(키보드 네비, 포커스 순서, 명도 대비, 스크린리더 라벨)

## 2026-02-16 추가 완료 항목

- 쓰기 API 보강:
  - 주요 쓰기 API에 `zod` 스키마 기반 JSON 입력 검증을 적용
  - 로그인 시 CSRF 토큰 쿠키를 발급하고, 클라이언트는 `x-csrf-token` 헤더 자동 전송
  - 서버는 `Origin`/`sec-fetch-site` + 더블 서브밋 CSRF 토큰을 함께 검증
- 차단 관리:
  - `GET/DELETE /api/blocked-owners` 추가
  - `/wordbooks/blocked` 차단 생성자 목록/해제 화면 추가
- 신고/모더레이션:
  - 신고 API에 30초 쿨다운 + 24시간 30회 제한 추가
  - 신고자 신뢰 점수(`reporterTrustScore`) 저장
  - 모더레이션 감사 필드 추가:
    - `reviewAction`, `previousStatus`, `nextStatus`, `reviewerIpHash`
- 랭킹 유지보수:
  - 내부 크론 엔드포인트 `POST /api/internal/cron/wordbook-rank` 추가
  - `CRON_SECRET` Bearer 인증으로 보호
  - 실행 시 재계산 건수 + stale 건수(1일 이상 미갱신) 반환
- CI:
  - `.github/workflows/ci.yml` 추가
  - `typecheck + test + test:e2e`를 CI에서 자동 실행
- 운영 문서:
  - `docs/OPERATIONS.md`에 DB 백업/복구/마이그레이션 롤백 플레이북 추가
- UI E2E + 접근성:
  - Playwright 기반 UI 플로우 테스트 추가: `tests/e2e/ui-flow.mjs`
  - 스크립트 추가: `npm run test:e2e:ui`
  - 접근성/모바일 개선:
    - skip link(`본문으로 건너뛰기`) + `main` 랜드마크 ID
    - 전역 focus-visible 아웃라인 강화
    - 네비게이션 `aria-label` 및 주요 상호작용 요소 테스트 식별자/라이브 영역 보강

## 2026-02-16 통합 학습 UX 업데이트

- 학습 진입 구조를 단순화:
  - 전역 `/memorize`, `/quiz-*`, `/list-*`는 `/wordbooks`로 리다이렉트
  - 학습은 `wordbooks/[id]` 내부에서만 진행
  - 상세 페이지에서 `memorize/quiz-meaning/quiz-word/list-*` 버튼으로 이동
- 다운로드 단어장 정책 강화:
  - `save meaning` 등 원본 변경 액션 비활성화(읽기 전용)
  - 정답/오답/회복 이력은 사용자별 상태로만 저장
  - `list-half`를 위해 다운로드 단어장 상태에 `everCorrect`, `everWrong` 이력 필드 추가
- 의미 렌더링 개선:
  - `(형)(명)...` 패턴을 태그 형태로 분리해 카드/결과 화면 가독성 개선
- 홈/전역 UI 개편:
  - 홈 카드/정책 영역/CTA 재배치
  - 전역 폰트(`Manrope`, `Noto Sans KR`) 적용 및 상단 네비 정리

## 2026-02-17 UX 아이디어 5종 구현

- 다운로드 전환 UX:
  - 다운로드 성공 시 `내 라이브러리` 상단 온보딩 배너 노출
  - `Memorize 시작 / Quiz Meaning / Quiz Word / 나중에` CTA 제공
  - `나중에` 선택 시 24시간 동일 단어장 재노출 제한
- 학습 네비게이션 UX:
  - 단어장 학습 화면에 공통 스터디 탭(`Memorize / Quiz / List`) 고정
  - 탭 클릭 시 `wordbook_last_tab_{id}` 저장, 상세 페이지에서 `마지막 학습 이어서` 제공
- 의미 가독성 UX:
  - 의미 표시 `간결/자세히` 토글 추가(로컬 저장)
  - `(명)(동)(형)` 태그를 `명사/동사/형용사` 등 라벨로 정규화 표시
- 다운로드 버전 UX:
  - `Wordbook.contentVersion` 및 `WordbookDownload.downloadedVersion` 도입
  - 변경 요약(`+추가 / ~수정 / -삭제`) 표시 및 버전 동기화 API 추가
  - 동기화 시 학습 상태 유지/초기화 선택 지원
- 세션 회고 UX:
  - 암기/퀴즈 세션에서 일정 활동 이후 회고 패널 노출
  - 다음 추천 행동(오답/회복/퀴즈/암기) + 예상 소요시간 + 루틴 알림 토글 제공

## 2026-02-17 마이그레이션 안정화

- `20260217000000_wordbook_versioning_sync` SQL을 PostgreSQL 호환 구문으로 수정
  - 파일 BOM 제거
  - `UPDATE ... FROM` 조인 참조 문제를 상관 서브쿼리 형태로 교체
- CI(`prisma migrate deploy`) 및 운영 DB 적용 안정성 개선

## 2026-02-17 의미 파서 보정

- `MeaningView` 파서를 개선해 `(명)...(동)...` 형태의 복합 품사 문자열을 품사별로 분리 렌더링
- `간결` 모드: 품사+의미를 항목 단위(칩)로 분리
- `자세히` 모드: 품사 그룹(명사/동사 등) 기준으로 줄바꿈 목록 표시

## 2026-02-17 UI 아이디어 5종 적용 완료(코드 반영)

- [x] 아이디어 1: 학습 대시보드 헤더 적용
  - `components/wordbooks/LearningDashboardHeader.tsx` 추가
  - 라이브러리 상단에 진행률/활성 단어장/업데이트 필요 지표 + 추천 CTA 배치
- [x] 아이디어 2: 컬러/타이포/카드 토큰 기반 시각 시스템 적용
  - `app/globals.css`에 `ui-*` 공통 토큰/컴포넌트 클래스 추가
  - 네비/라이브러리/마켓/학습 화면에 공통 스타일 적용
- [x] 아이디어 3: 밀도 모드(컴팩트/표준/집중) 적용
  - `components/ui/useDensityMode.ts`, `DensityModeToggle.tsx` 추가
  - memorize/quiz/list 화면에 밀도 모드 토글 및 로컬 저장 연동
- [x] 아이디어 4: 저소음 모션 정책 적용
  - 카드 진입 `ui-fade-in` 및 `prefers-reduced-motion` 강화
  - 과도한 모션 대신 핵심 전환만 유지
- [x] 아이디어 5: 행동 중심 Empty State 적용
  - `components/ui/EmptyStateCard.tsx` 추가
  - 라이브러리/마켓/학습/퀴즈/리스트의 빈 상태를 액션형으로 통일

추가 반영:
- 레이아웃 skip link 한글 깨짐 수정(`app/layout.tsx`: "본문으로 건너뛰기")
- 마켓 페이지 JSX 파싱 오류(`->`) 수정으로 타입체크/빌드 안정화

검증 결과:
- `npm run typecheck` 통과
- `npm run test` 통과
- `npm run build` 통과

## 2026-02-16 Memorize UX 조정

- `/wordbooks` 라이브러리에서 단어장 제목 클릭 시 상세(`/wordbooks/[id]`) 대신
  바로 `/wordbooks/[id]/memorize`로 이동하도록 변경.
- `/wordbooks/[id]/memorize` 하단에 고정 컨트롤 바 추가:
  - 검색(한 줄), 페이지 이동(이전/다음/직접 이동), 표시 개수(기본 1, 최대 50).
  - 전체 단어를 한 번에 렌더링하지 않고 페이지 단위로 표시.
- `MeaningView`의 `자세히` 모드 출력 형식 개선:
  - 기존 줄바꿈/불릿 중심에서 `명사 님, -씨, 미스터` 형태의 한 줄 그룹 표시로 변경.
- `memorize` 카드에서 `Correct / Wrong / Reset` 수동 버튼 제거.
- 각 단어 옆에 스피커 아이콘 버튼 추가(브라우저 `SpeechSynthesis` 발음 재생).
- 의미 파서 보정:
  - `(부)정확(正確)히` 같은 문자열에서 `(正確)`를 품사 태그로 오인하지 않도록 수정.
  - 결과가 `부사 정확(正確)히` 형태로 안정적으로 표시됨.
- "마지막 단어장 이어서" 개선:
  - 학습 화면 진입 시 `last_study_wordbook_id` 쿠키를 저장.
  - `/wordbooks` 대시보드 추천 CTA는 이 쿠키를 우선 사용해 실제 마지막으로 학습한 단어장으로 이동.
- 단어장 생성 정책/가이드 보강:
  - 서버에서 FREE 생성 1회 제한, PRO 무제한 생성을 강제.
  - `/wordbooks/new`에 좋은 단어장 작성 가이드라인(제목/설명/구성/예문 원칙) 추가.
- 학습 파트(part) 기능:
  - 퀴즈와 리스트(`list-correct`, `list-wrong`, `list-half`)에서 part 단위 학습 지원.
  - part 기준은 `1번째 단어 ~ n번째 단어`, `n`은 단어장별 설정(로컬 저장)으로 조정.
  - 기본 part 크기(`n`)는 30.
  - part 개수는 `전체 단어 수 / n`으로 계산.
  - 리스트 화면 각 part 버튼에 `p/n` 표시(`p`: 해당 리스트 조건에 맞는 단어 수).
- memorize 보강:
  - 하단 고정 컨트롤에 `맞춘 단어 숨김` 토글 추가(정답 상태 단어 제외, 로컬 저장).
  - 기본 표시 단어 개수는 4.
  - memorize 화면의 상단 `Back` 버튼 제거.
- 퀴즈 UI 보정:
  - 퀴즈의 `Mode` 선택을 별도 카드에서 제거하고 `품사/의미 표시` 컨트롤 카드에 통합해 상단 공간을 절약.
- 리뷰 기능:
  - 다운로드한 단어장(또는 소유 단어장)에 평점과 댓글을 함께 저장 가능.
  - 마켓에서 별점 영역 클릭 시 리뷰 목록(댓글 + 평점) 펼쳐보기 지원.
- 배포 안정화:
  - `/wordbooks/new` 가이드 문구의 JSX 이스케이프를 보정해 `next build` ESLint(`react/no-unescaped-entities`) 실패를 해결.

## 2026-02-17 Study/List/Quiz performance refactor (1~4 + extra observations)

- [x] `GET /api/wordbooks/[id]/study` was refactored to server-side paging/filtering.
  - Added query support: `view`, `page`, `take`, `q`, `hideCorrect`, `partSize`, `partIndex`.
  - `memorize`, `list-correct`, `list-wrong`, `list-half` no longer require full wordbook payloads.
- [x] `/wordbooks/[id]/memorize` client now consumes paged API data only.
  - Removed full in-memory filtering/pagination pattern on client.
  - Uses per-item `itemState` from API instead of loading full state maps.
- [x] `/wordbooks/[id]/list-*` client now uses server-driven part pagination and stats.
  - `partStats` (`p/n`) are computed on server and rendered directly by client.
- [x] `GET /api/wordbooks/[id]/quiz` now selects question candidates in DB.
  - Tiered random pick strategy: unseen -> wrong -> fallback.
  - Avoids loading all items/states for each quiz request.
- [x] Added DB indexes for state-heavy reads.
  - `WordbookStudyItemState(userId, wordbookId, status)`
  - `WordbookStudyItemState(userId, wordbookId, everCorrect, everWrong)`
  - Migration: `20260217021000_add_study_state_indexes`

Additional observations and guardrails:
- Client simplification is safe when authority remains on server (filters, paging, permissions).
- Keep all business rules centralized in API routes and return minimal DTOs to prevent drift.
- For very large datasets, consider cursor pagination for deep page access and cache `partStats` by `(userId, wordbookId, view, q, hideCorrect, partSize)`.
- [x] Extra guardrail applied:
  - Added in-memory TTL cache (30s) for study `partStats` in `GET /api/wordbooks/[id]/study`.
  - Added cache invalidation on study mutations:
    - `POST /api/wordbooks/[id]/study/items/[itemId]`
    - `POST /api/wordbooks/[id]/quiz/submit`
    - `POST /api/wordbooks/[id]/sync-download` (when study state reset)
- [x] Client simplification follow-up:
  - `WordbookStudyClient` now resets paging through input handlers (`query/pageSize/hideCorrect`) instead of separate reset effects.
  - Removed redundant `useMemo` usage for progress and simplified page clamping flow.
  - `WordbookListClient` removed duplicated title state and uses memoized part-stat lookup map.
- [x] Loading UI stabilization:
  - Removed inline `Loading...` text blocks that pushed content down.
  - Added non-layout-shifting loading badge overlay (`absolute`) with `min-h` containers in memorize/list study views.

## 2026-02-16 Text encoding and quiz feedback fixes

- Fixed broken text rendering (mojibake) in:
  - `/wordbooks/[id]/list-correct`
  - `/wordbooks/[id]/list-wrong`
  - `/wordbooks/[id]/list-half`
  - related study/quiz/review labels in shared clients
- Updated quiz result UX:
  - Correct answer now shows a green `정답` feedback panel.
  - Wrong answer now shows a red `오답` feedback panel and the actual correct answer.
  - Added explicit `다음 문제` action after each submission.

## 2026-02-16 Button visual polish (SaaS tone)

- Updated button color tokens:
  - `--primary: #2563EB`
  - `--accent: #F59E0B`
- Refined button hierarchy:
  - `ui-btn-primary`: solid blue, stronger contrast
  - `ui-btn-accent`: solid orange, darker hover, cleaner CTA emphasis
  - `ui-btn-secondary`: soft tinted secondary (no heavy empty outlines)
- Updated tab states to match the same hierarchy:
  - `ui-tab-active`: filled primary
  - `ui-tab-inactive`: soft secondary tint
- Applied secondary tone to memorize bottom controls to reduce outline noise.
- Pricing `Recommended` badge now uses token-based accent styling (`ui-badge-accent`).

## 2026-02-16 UX fixes (rating/quiz/memorize)

- Fixed wordbook rating star glyph rendering (`??` -> `★`) in `StarRating`.
- Quiz flow improvements:
  - Removed in-panel mode selector from `/wordbooks/[id]/quiz` UI.
  - Kept explicit `다음 문제` button after grading.
  - Added Enter-key progression after grading (press Enter to move to next question).
- Memorize bottom fixed bar stability:
  - Bottom control bar now stays mounted while loading (no disappear/reappear flicker).
  - Controls are disabled during loading instead of unmounting the bar.

## 2026-02-17 Daily goal dashboard update

- Added per-user daily goal setting (`User.dailyGoal`, default `30`).
- New endpoint: `POST /api/users/me/daily-goal`
  - payload: `{ "dailyGoal": number }` (`1..500`)
- Dashboard metric changed:
  - Old: cumulative accuracy (`correctCount / studiedCount`)
  - New: daily progress (`todayCorrect / dailyGoal * 100`, capped at 100)
- Daily correct count uses `WordbookStudyItemState`:
  - condition: `lastResult = CORRECT` and `updatedAt` within today.
- Added index for daily aggregation performance:
  - `WordbookStudyItemState(userId, lastResult, updatedAt)`
- Added UI control to update daily goal in Learning Dashboard.

## 2026-02-17 Wordbooks CTA deduplication

- Simplified duplicated navigation actions in `/wordbooks`:
  - Removed dashboard-level `단어장 더 찾기` button (duplicate of top `Market` action).
  - Reduced lower empty-state actions to a single primary CTA each.
- Goal:
  - Keep top-level quick actions as global navigation.
  - Avoid repeating the same destination buttons in lower sections.

## 2026-02-17 Wordbook quiz SRS update

- Updated quiz interval policy for correct answers:
  - 1st correct: +1 hour
  - 2nd correct: +1 day
  - 3rd correct: +3 days
  - 4th correct: +7 days
  - 5th+ correct: +30 days
- Meaning quiz and word quiz are now scheduled independently in wordbook quiz mode.
  - Correct streak and next-review timestamps are tracked per mode.
- Wrong-answer requeue policy added for wordbook quiz:
  - Wrong item reappears after 10 quiz submissions in the same mode.
  - If fewer than 10 questions remain in cycle, wrong items are brought back at the tail.
- Added schema support for mode-specific SRS fields:
  - `WordbookStudyState.meaningQuestionCount`, `WordbookStudyState.wordQuestionCount`
  - `WordbookStudyItemState.meaningCorrectStreak`, `meaningNextReviewAt`, `meaningWrongRequeueAt`
  - `WordbookStudyItemState.wordCorrectStreak`, `wordNextReviewAt`, `wordWrongRequeueAt`
  - New indexes for mode-specific review/requeue lookups.

## 2026-02-17 Wordbook detail error fallback

- Added route-level error UI for `/wordbooks/[id]`:
  - file: `app/wordbooks/[id]/error.tsx`
  - replaces generic production `Application error` screen with a recoverable page (`다시 시도`, `내 단어장으로 이동`).

## 2026-02-17 /wordbooks/[id] server-client boundary fix

- Fixed production runtime digest `2262071249` on `/wordbooks/[id]`.
- Root cause: `WordbookStudyTabs` was a Server Component using `onClick` (client event handler) on `Link`.
- Change: marked `components/wordbooks/WordbookStudyTabs.tsx` as a Client Component (`"use client"`).
- Result: removed `Event handlers cannot be passed to Client Component props` runtime failure.
