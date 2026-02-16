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
- 마켓은 단어장별 `downloadCount`, `ratingAvg`, `ratingCount`를 표시하며 기본 정렬은 “Top(평점/평가수/다운로드/최신)”이다.

플랜 정책(서버 강제)
- FREE
- 공개 단어장 다운로드 **평생 3회 제한**
- 업로드(내가 만든) 단어장은 **강제 공개**
- PRO
- 다운로드 **무제한**
- 업로드 단어장 공개/비공개 선택 가능

가격(표시용, 결제 연동은 아직 없음)
- PRO 월: 2,900원
- PRO 연: 29,000원

## 페이지(웹)

- `/` 홈
- `/memorize` 암기(스페이스드 리피티션)
- `/quiz-meaning`, `/quiz-word` 퀴즈
- `/list-correct`, `/list-wrong`, `/list-half` 리스트(정답/오답/회복)
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
- `GET /api/wordbooks/downloaded` 내가 다운로드한 단어장 목록

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

## Railway 배포(권장)

이 저장소에는 `railway.json`이 포함되어 있고, 서버 시작 전에 마이그레이션을 실행한다.

필수 환경변수
- `DATABASE_URL` (Railway PostgreSQL 또는 외부 PostgreSQL)
- `GOOGLE_TRANSLATE_API_KEY` (선택)
- `AUTH_SECRET` (필수, 32자 이상 권장)
- `AUTH_BOOTSTRAP_TOKEN` (필수: 최초 사용자 생성용 bootstrap API 보호)
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

## Railway 시작 커맨드

```bash
npm run start:railway
```

이 커맨드는 다음을 수행한다.
1. `prisma generate`
2. `prisma migrate deploy`
3. `node prisma/seed.js`
4. `next start -p $PORT`

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

## 앞으로 할 일(TODO)

- [ ] 결제 연동(월/연 구독) + 자동 플랜 활성화/만료 처리
- [ ] OAuth 로그인(구글/네이버/카카오) + 계정 연결
- [ ] 다운로드한 단어장 “개인 학습 상태”(체크/오답/진도) 저장(콘텐츠 수정 없이 개인 데이터로)
- [ ] 마켓 랭킹 개선(조작 방지: 평점 신뢰도 + 다운로드 + 최근성)
- [ ] 신고/차단/모더레이션(공개 단어장 운영 도구)
- [ ] 단어장 import/export(TSV/CSV) + 선택적 발음 자동 채움
- [ ] 예문/문장 기능(추가 기능) + 단어장 기반 퀴즈 모드
- [ ] PWA 설치 UX + 오프라인 캐싱 전략 강화(라우트 단위)

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

아직 남은 항목(외부 연동 키 필요):

- [ ] 결제 연동(구독 결제) + 플랜 자동 활성화/만료 처리
- [ ] OAuth 로그인(구글/네이버/카카오) + 계정 연결

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
- [ ] 결제 연동 + 플랜 자동 라이프사이클
- [ ] OAuth 로그인 + 계정 연결

신규 백로그(직접 서버 점검 및 분석 기반):

- [ ] 레거시 페이지/문서에 남아있는 한글 인코딩 깨짐(모지바케) 완전 정리
- [ ] 모든 쓰기 API에 `zod`(또는 동급) 스키마 검증 적용
- [ ] 현재 Origin 체크 외 CSRF 토큰(더블 서브밋/동기화 토큰) 추가
- [ ] 차단 해제 UI(`BlockedOwner` 관리 화면) 추가
- [ ] 모더레이션 감사 로그 필드 강화(처리 전/후 상태, 사유 코드, 처리자 IP 해시)
- [ ] 신고 악용 방지(쿨다운, 중복 신고 억제, 신고자 신뢰 점수)
- [ ] E2E를 HTTP 스모크에서 UI 플로우 테스트까지 확장
  - 로그인 -> 마켓 -> 다운로드 -> 학습 -> 퀴즈 -> 신고 -> 모더레이션
- [ ] CI 파이프라인에 `typecheck + test + test:e2e` 고정
- [ ] 랭킹 유지보수 작업 스케줄링(일 단위 재계산 + 점수 드리프트 모니터링)
- [ ] 관측성 스택 추가(구조화 로그, 에러 추적, 라우트별 4xx/5xx/지연 대시보드)
- [ ] DB 백업/복구 런북 및 마이그레이션 롤백 플레이북 추가
- [ ] 접근성/모바일 QA 패스(키보드 네비, 포커스 순서, 명도 대비, 스크린리더 라벨)
