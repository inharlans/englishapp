# Englishapp

Englishapp은 영어 학습과 단어장 마켓을 제공하는 웹 애플리케이션입니다.

- 프레임워크: Next.js(App Router)
- 언어/런타임: TypeScript, Node.js
- DB: PostgreSQL + Prisma
- 결제: PortOne
- 핵심 대상 사용자: 한국어 사용자/관리자

## 최근 업데이트 (2026-02-21)

- 카드 학습 로딩을 병렬 페이지 요청으로 최적화하고, 요청 경합 보호(request sequence), 모바일 파트 `select`, 에러 재시도 버튼, 파트/전체 진행률 `progressbar` 접근성 속성을 추가해 카드 학습 안정성을 보강했습니다.
- 카드 학습 파트 UX를 추가 보강해 파트가 비어 있어도 `[`/`]`로 파트 이동되도록 수정하고, `Home`/`End`(처음/끝 카드)·`PageUp`/`PageDown`(이전/다음 파트) 단축키, 파트 범위 표시, 중심형 파트 버튼(생략부호), 파트/전체 이중 진행률을 반영했습니다.
- 카드 학습(`/wordbooks/[id]/cards`)에도 파트 분할을 적용해 `partSize/partIndex` 기반으로 파트별 카드만 보고, 파트 크기 조절·이전/다음·직접 파트 이동(`이동`)을 사용할 수 있도록 개선했습니다.
- MCP 실측(`wordbooks/55` 학습 탭) 기반으로 학습 화면의 PWA 설치 배너 노출 범위를 조정하고(집중형 학습 경로 제외), `나중에` 선택 시 7일 유예를 저장하도록 보강했으며, 퀴즈/목록 파트 네비게이션을 대량 버튼 전체 렌더에서 중심형(생략부호 포함)으로 개선하고 파트 직접 이동 입력(`이동`)·`Home`/`End` 단축키·퀴즈 제출 후 입력 초기화·빈 상태 CTA 쿼리 유지까지 반영했습니다.
- PortOne 전자결제 심사 대비를 위해 전역 푸터에 사업자/고객센터 정보를 상시 노출하도록 추가했습니다(환경변수 기반).
- `/pricing` 페이지에 상품명/결제금액/제공방식/해지·환불 기준을 명시한 심사용 안내 블록을 추가했습니다.
- `/terms`, `/privacy`에 고객센터 문의처를 함께 명시해 심사 시 필수 확인 정보를 보강했습니다.
- 운영용 푸터 경고문은 개발 환경에서만 표시되도록 변경하고, 누락 필드 사용자 노출값을 `준비 중`으로 통일했습니다.
- 네비게이션 활성 경로 판정을 하위 경로까지 반영하고(`aria-current`), 마켓 검색 안내(제작자 이메일 포함), 단어장 날짜 표기(Asia/Seoul), 차단 용어(`차단 목록`)를 정리했습니다.
- 오프라인 라이브러리에서 로딩/삭제 상태 UX를 보강하고(중복 요청 방지, 삭제 실패 피드백), 저장일 표기를 `Asia/Seoul` 기준으로 통일했습니다.
- 마켓 페이지네이션 접근성을 보강해 비활성 링크를 제거하고, 하단 고정 페이지네이션을 모바일 전용으로 제한했으며, 오프라인 제작자 이메일 노출을 마스킹 처리했습니다.
- 마켓 카드 액션 영역을 경량화해 신고 안내 문구 반복을 제거하고, 차단 관련 용어를 `차단 목록`으로 통일했습니다.
- 로그인/빈 상태 CTA를 정리하고 상태 메시지 접근성(`role`, `aria-live`)을 보강했으며, 단어장/마켓 설명 파싱 중복 계산을 제거해 렌더 비용을 줄였습니다.
- 마켓/오프라인 접근성 점검 10건을 반영해 필터 페이지 리셋, 페이지네이션 랜드마크, 목록 role, 리뷰 aria-label/날짜 표기, 오프라인 필터 초기화 포커스 복귀를 개선했습니다.
- 단어장 대시보드 점검 10건을 반영해 당일 목표 입력 검증/성공·실패 피드백/Enter 저장/유효성 기반 버튼 상태를 보강하고, 다운로드 배너 및 단어장 목록의 접근성 role/aria-label을 강화했습니다.
- 홈/네비/오프라인 점검 10건을 반영해 로그인 복귀 경로(`next`) 보강, 단계/정책/빠른이동 랜드마크 정리, 오프라인 검색 보조문구·빈 상태 복구 동선·목록/버튼 aria-label을 개선했습니다.
- 마켓/상세 점검 10건을 반영해 로그인 복귀 컨텍스트 유지(`next` 쿼리), 필터 즉시 초기화, 상세 날짜 KST 통일, 상세 목록/페이지네이션 접근성(role/listitem/비활성 span) 개선을 적용했습니다.
- 내 단어장(`/wordbooks`) 점검 10건을 반영해 다운로드 버전 로그 집계를 최적화하고, 무료 잔여 용량/업데이트 가능 배너/섹션 랜드마크/카드 목적 aria-label/최근 수정일/빈 상태 보조 CTA를 보강했습니다.
- 오프라인 라이브러리/학습 점검 10건을 반영해 새로고침·삭제 상태 피드백, 필터 상태 문구, 온라인 원본 진입 동선, 키보드 단축키(←/→/Space), 진행률 바, 빈 카드 안내를 보강했습니다.
- `/wordbooks/[id]` 퀴즈 점검 10건을 반영해 입력창 자동 포커스, 빈 입력 제출 방지, 건너뛰기, 정답률/파트 진행률 표시, 파트 변경 시 피드백 초기화, 로그인/상세 복귀 동선을 보강했습니다.
- `/wordbooks/[id]/memorize` 점검 10건을 반영해 로그인/복귀 동선, 키보드 단축키(`/`, `←/→`, `H`), 필터 초기화/Enter 페이지 이동, 상태 한글화, 접근성(`aria-pressed`, alert/status)을 보강했습니다.
- MCP 실측(`/wordbooks/market -> /wordbooks/[id] -> /quiz-meaning`) 기반 점검 10건을 반영해 퀴즈 정답률/파트 진행률 계산을 정정하고, 파트 전환 UX(이전/다음 파트), 단축키(`/`,`S`,`N`), 건너뛰기 피드백, 로그인 복귀 경로를 보강했습니다.
- MCP 실측(`/wordbooks/[id]/quiz-word`)에서 오답 제출 시 피드백이 사라지는 큐 재호출 버그를 수정하고, `[`/`]` 파트 단축키, 입력 안정화(자동보정 off), 로딩/상태 접근성, 모드별 답안 안내를 보강했습니다.
- MCP 실측(`/wordbooks/[id]/cards`) 기준으로 카드 페이지 문구/마크업 깨짐을 정리하고, 로그인 복귀 경로, 로딩 중 카운트 오해 제거, 카드 단축키(`←/→`, `Space`, `R`), 진행률/빈 상태/피드백 접근성을 보강했습니다.
- MCP 실측(`/wordbooks/[id]/list-*`) 기반으로 목록 페이지 문구 깨짐을 정리하고, 로그인 복귀 경로/상세 복귀 동선, 파트 표시 보정(`partStats` 최대 index 반영), `[`/`]` 파트 단축키, 상태 한글화, 로딩/오류 접근성을 보강했습니다.
- MCP 점검 흐름 연속성을 위해 학습 탭 공통 컨텍스트를 보강해 `partSize/partIndex`를 URL 쿼리와 동기화하고, 탭 링크에서 해당 쿼리를 유지하도록 개선했으며, 목록 초기 로딩 깜빡임/재시도 UX를 정리했습니다.
- MCP 실측으로 탭 링크 쿼리 stale 문제를 확인해 `WordbookStudyTabs`를 `useSearchParams` 기반으로 전환하고, `useWordbookParting`의 파트 자동 보정 시 URL/localStorage까지 즉시 동기화하도록 보강했습니다.
- 단어장 퀴즈 제출 시 전체 문항 상태 재집계를 제거하고, 상태 변화량(delta) 기반으로 학습 집계를 갱신하도록 개선해 대용량 단어장 응답 지연을 완화했습니다.
- 단어장 퀴즈 출제 로직에서 모드별 오답 재출제 큐를 `status` 공용값이 아닌 모드별 재출제 필드(`meaningWrongRequeueAt` / `wordWrongRequeueAt`) 기준으로 분리해 재출제 정확도를 높였습니다.
- 변경 요청 보호 로직을 강화해 `Origin`/`Referer`가 모두 없는 요청을 차단하고, 호스트 불일치 요청을 더 엄격하게 차단합니다.

## 최근 업데이트 (2026-02-20)

- 퀴즈 채점 정규화를 강화해 의미 입력의 기호/접두 표기 차이(`...에서` 등) 허용 범위를 확대했습니다.
- 의미 퀴즈 오답 시 `허용 답안 예`를 함께 노출해 채점 기준을 더 명확히 안내합니다.
- 모바일 퀴즈 화면에서 파트 선택 과밀을 줄이기 위해 파트 선택 드롭다운을 추가했습니다.
- 오답 피드백에 `다시 풀기` 액션을 추가해 동일 문항 즉시 재시도가 가능해졌습니다.
- 의미 데이터 정제 스크립트를 개선해 품사+의미 비정상 결합 형태를 자동 보정할 수 있게 했습니다.
- 세션 내 오답 재출제 큐를 추가해 오답 문항이 다음 문제 흐름에서 자동 재등장하도록 개선했습니다.
- 오답 피드백에 입력 정규화값/가장 가까운 허용 답안/유사도 기반 채점 근거를 노출하도록 고도화했습니다.
- 관리자 지표 API(`/api/admin/metrics`)에 퀴즈 재검토 후보 오답 비율(`quizQuality`)을 추가했습니다.
- 관리자 화면에서 퀴즈 재검토 후보 비율(`quizQuality`)을 SLO 요약 칩으로 확인할 수 있게 했습니다.
- 결제 체크아웃/구독해지 리다이렉트 기준 URL을 프록시 헤더 우선으로 보정해 운영에서 `localhost`로 되돌아가는 문제를 방지했습니다.
- KG이니시스 V2 빌링키 발급 필수값 대응을 위해 체크아웃 payload에 구매자 휴대폰 번호를 포함하도록 보강했습니다.

## 핵심 기능

### 1. 학습 기능
- 영어 단어 학습(암기/퀴즈)
- 정답/오답/반반 리스트 기반 복습
- 사용자별 학습 상태 저장

### 2. 단어장 기능
- 단어장 생성/수정/삭제
- 항목(단어, 뜻, 발음, 예문, 예문 뜻) CRUD
- 공개/비공개 전환
- 버전 추적 및 동기화

### 3. 마켓 기능
- 공개 단어장 탐색(검색/정렬/페이지네이션)
- 다운로드/평점/리뷰/신고
- 품질 정책 기반 노출 필터링
  - 최소 100단어 이상 노출
  - 테스트성 제목 키워드 차단

### 4. 오프라인 기능
- IndexedDB 기반 오프라인 저장
- 오프라인 학습 페이지 제공
- 동기화 CTA 제공

### 5. 결제/요금제
- FREE / PRO
- PortOne 결제 흐름(체크아웃/확정/웹훅/포털)
- 서버 측 요금제 권한 강제

### 6. 관리자/운영
- 사용자/플랜 관리
- 신고 처리(검토 중/해결/기각/숨김)
- 운영 지표(SLO, 에러, 라우트별 성능) 확인
- 내부 크론 잡 운영

## 페이지

- `/` 랜딩
- `/login`, `/logout`
- `/wordbooks` 내 단어장
- `/wordbooks/new` 단어장 생성
- `/wordbooks/[id]` 단어장 상세
- `/wordbooks/market` 마켓
- `/offline`, `/offline/wordbooks/[id]` 오프라인
- `/pricing` 요금제/결제
- `/admin` 관리자
- `/privacy`, `/terms`

## 주요 API

### 인증
- `POST /api/auth/bootstrap`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### 단어장
- `GET /api/wordbooks`
- `POST /api/wordbooks`
- `GET /api/wordbooks/[id]`
- `PATCH /api/wordbooks/[id]`
- `DELETE /api/wordbooks/[id]`
- `POST /api/wordbooks/[id]/items`
- `PATCH /api/wordbooks/[id]/items/[itemId]`
- `DELETE /api/wordbooks/[id]/items/[itemId]`
- `POST /api/wordbooks/[id]/publish`
- `GET /api/wordbooks/market`
- `POST /api/wordbooks/[id]/download`
- `POST /api/wordbooks/[id]/sync-download`
- `POST /api/wordbooks/[id]/rate`
- `GET /api/wordbooks/[id]/reviews`
- `POST /api/wordbooks/[id]/report`
- `POST /api/wordbooks/[id]/block`

### 학습/퀴즈
- `GET /api/wordbooks/[id]/study`
- `POST /api/wordbooks/[id]/study/items/[itemId]`
- `GET /api/wordbooks/[id]/quiz`
- `POST /api/wordbooks/[id]/quiz/submit`

### 결제
- `POST /api/payments/checkout`
- `POST /api/payments/confirm`
- `POST /api/payments/webhook`
- `POST /api/payments/portal`

### 관리자/운영
- `GET /api/admin/users`
- `POST /api/admin/users/[id]/plan`
- `GET /api/admin/reports`
- `POST /api/admin/reports/[id]`
- `GET /api/admin/metrics`
- `POST /api/admin/wordbooks/recompute-rank`
- `POST /api/internal/cron/wordbook-rank`
- `POST /api/internal/cron/plan-expire`

## 로컬 실행

1. 의존성 설치
```bash
npm ci
```

2. Prisma 준비
```bash
npm run prisma:generate
npm run prisma:migrate
```

3. 개발 서버 실행
```bash
npm run dev
```

## 테스트/검증

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
```

로컬 E2E 고정 명령:
```bash
npm run test:e2e:local
npm run test:e2e:local:smoke
npm run test:e2e:local:ui
```

자동 반복 실행(12분 주기 기본값, 승인 없음):
```bash
npm run auto:loop
```

예시(5분 주기, 지정 명령 무한 반복):
```powershell
powershell -ExecutionPolicy Bypass -File scripts/auto-loop-runner.ps1 -IntervalMinutes 5 -CycleCommand "npm run typecheck"
```

예시(체인 명령 + 타임아웃/연속실패/로그):
```powershell
powershell -ExecutionPolicy Bypass -File scripts/auto-loop-runner.ps1 -IntervalMinutes 5 -CycleCommand "npm run typecheck && npm test" -TimeoutMinutes 8 -MaxConsecutiveFailures 2 -LogPath ".\auto-loop.log"
```

## 필수 환경 변수(대표)

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_BOOTSTRAP_TOKEN`
- `CRON_SECRET`

PortOne 결제 연동:
- `PORTONE_API_SECRET`
- `PORTONE_WEBHOOK_SECRET`
- `PORTONE_STORE_ID`
- `PORTONE_CHANNEL_KEY`
- `PORTONE_PRICE_MONTHLY_KRW`
- `PORTONE_PRICE_YEARLY_KRW`

전자결제 심사용 사업자/고객센터 노출:
- `COMPANY_LEGAL_NAME`
- `COMPANY_REPRESENTATIVE`
- `COMPANY_BUSINESS_NUMBER`
- `COMPANY_MAIL_ORDER_NUMBER`
- `COMPANY_ADDRESS`
- `COMPANY_SUPPORT_EMAIL`
- `COMPANY_SUPPORT_PHONE`
- `COMPANY_SUPPORT_HOURS`

## 결제 인수인계 상태 (2026-02-19 기준)

기준 문서: `docs/HANDOFF_PORTONE_2026-02-19.md`

### 오늘 완료된 항목
- PortOne 콘솔 가입/로그인 완료
- `PORTONE_STORE_ID` 확인 완료
- `PORTONE_API_SECRET` 발급 및 Railway 반영 완료
- 웹훅 설정 완료
  - URL: `https://www.oingapp.com/api/payments/webhook`
  - `PORTONE_WEBHOOK_SECRET` 발급 및 Railway 반영 완료
- Railway 반영 완료
  - `PORTONE_API_SECRET`
  - `PORTONE_WEBHOOK_SECRET`
  - `PORTONE_STORE_ID`
  - `PORTONE_PRICE_MONTHLY_KRW=2900`
  - `PORTONE_PRICE_YEARLY_KRW=29000`
  - `CRON_SECRET` (기존 유지)
- GitHub Actions 시크릿 확인 완료
  - `APP_BASE_URL`
  - `CRON_SECRET`
- `Scheduled Internal Cron Jobs` 수동 실행 성공 확인

### 현재 블로커 (미완료 1건)
- `PORTONE_CHANNEL_KEY` 미설정
  - 사유: PortOne 채널 생성 시 PG 테스트 자격증명(MID/secret/client key 등)이 필요
  - 자격증명 없이는 채널 생성 불가 → `CHANNEL_KEY` 발급 불가

### 사업자 번호 확보 후 즉시 실행 순서
1. 대상 PG(예: 토스페이먼츠, KG이니시스) 테스트 자격증명 확보
2. PortOne에서 테스트 채널 생성 후 `CHANNEL_KEY` 발급
3. Railway에 `PORTONE_CHANNEL_KEY` 추가 후 배포
4. 앱 결제 플로우 검증
   - `/pricing` 월간/연간 결제 진입
   - 성공 리다이렉트: `/pricing?payment=success`
   - 사용자 `plan=PRO`, `proUntil` 반영 확인
5. 취소 플로우 검증
   - 구독 관리에서 해지
   - `/pricing?payment=cancel` 확인
   - DB `stripeSubscriptionStatus=canceled` 확인

보안 주의:
- 실제 시크릿 값은 문서에 기록하지 말고 Railway/GitHub Secrets에서만 관리합니다.

## 배포 메모

Railway 기준:
- `npm run start:railway`
- 필요 시 `npm run start:railway:seed`
- 크론 워크플로우/시크릿 설정 필요

## 최근 변경 사항

### 2026-02-20 서비스 개선 제안 5건 반영
- 의미/품사 렌더링 개선
  - `components/MeaningView.tsx`에서 품사 태그 파싱/칩 렌더링 정규화
  - `동사같다` 같은 붙은 텍스트를 품사+뜻 형태로 보정 표시
- 마켓 신뢰도/탐색성 개선
  - `app/wordbooks/market/page.tsx`에 `초보 추천` 섹션 추가
  - 설명 없는 단어장에 기본 설명 문구 자동 노출
  - 배지 로직 강화(`추천/신규/많이 다운로드/설명 있음`)
  - `lib/wordbookPresentation.ts` 배지 유틸 개선
- 카드 학습 롤아웃 안정화
  - 카드 탭/이어하기에 feature flag 반영
  - 환경변수: `NEXT_PUBLIC_ENABLE_WORDBOOK_CARDS` (`0`이면 비활성)
  - 스모크 테스트에 카드 라우트 404 방지 체크 추가
- 신고/차단 UX 명확화
  - `블랙` 버튼/문구를 `차단` 중심으로 정리
  - 차단 해제 경로(`블랙리스트 관리`) 즉시 안내
- 대용량 단어장 성능 개선
  - `app/wordbooks/[id]/page.tsx` 단어 목록 서버 페이지네이션 적용
  - 쿼리 파라미터: `page`, `take` (기본 `take=80`)
  - 전체 항목 일괄 렌더를 제거해 초기 렌더 부담 완화

### 2026-02-19 단어장 UX/콘텐츠 품질 개선
- 온라인 카드 학습 페이지 추가
  - 경로: `/wordbooks/[id]/cards`
  - 동작: 오프라인과 동일하게 `눌러서 뜻 보기` 기반 플래시카드 학습
  - 학습 탭에 `카드` 메뉴 추가
- 퀴즈/목록 파트 크기 초기값 이슈 수정
  - 증상: 첫 진입 시 `파트 크기`가 1로 내려가는 케이스 발생
  - 원인: 저장값이 없을 때 `Number(\"\")`가 0으로 처리되고, 클램프 로직이 1로 보정
  - 조치: 유효하지 않거나 0 이하 값은 기본값 30으로 처리하도록 수정
- 의미 데이터 정제 파이프라인 구축 및 실행
  - 스크립트:
    - `npm run wordbooks:report-meaning-quality`
    - `npm run wordbooks:cleanse-meaning-quality`
    - `npm run wordbooks:cleanse-meaning-quality:apply`
  - 정제 결과:
    - `WordbookItem`의 `(?)` 표기 `381 -> 0`
    - 슬랭/노이즈 표현 포함 건 `14 -> 0`
    - 총 `405`개 항목 정제 반영
  - 상세 문서: `docs/MEANING_DATA_CLEANUP_PLAN_2026-02-19.md`

### 2026-02-19 의미 퀴즈 오답 판정 수정
- 현상: 의미 퀴즈에서 사용자가 의미를 맞게 입력해도 오답 처리되는 케이스가 발생
  - 재현 예시: `because`의 뜻이 `(접)때문에, 왜냐하면...`일 때, 사용자 입력 `때문에`가 오답 처리
- 원인: 의미 정답 비교 시 품사 접두 표기(예: `(접)`, `(동)`, `(부)`, `(대)`)를 제거하지 않고 문자열을 그대로 비교
- 조치:
  - `lib/text.ts`에 `getMeaningCandidates` 공통 유틸 추가
  - 후보 생성 시 원문 + 분리 토큰 + 품사 접두 제거 토큰을 함께 생성하도록 변경
  - 적용 라우트:
    - `POST /api/wordbooks/[id]/quiz/submit`
    - `POST /api/quiz/submit` (레거시 퀴즈 경로)
  - 회귀 테스트 추가: `lib/text.test.ts` (`getMeaningCandidates` 케이스)

### 2026-02-19 Round 2
- 결제/로그인/요금제 페이지 한글 문구 정리
- 텍스트 품질 가드 확장(설명/리뷰 포함)
- 내부 메타 설명 노출 분리(displayDescription)
- 관리자 신고 워크플로우 확장 + SLO 요약 표시
- 오프라인 동기화 CTA 보강

### 2026-02-19 마켓 긴급 수정
- 마켓이 0개로 보이던 과도한 필터 문제 수정
- 필터 정책 단순화: 최소 단어 수 + 제목 기반 테스트 키워드 중심

### 2026-02-19 운영 반영 보강
- 홈 푸터 링크 문구 한글화 (`개인정보처리방침`, `서비스 이용약관`)
- 관리자 초기 렌더 사용자 이메일 마스킹 정렬(API 응답과 동일 정책)
- 관리자 지표 API의 깨진 문자열(인코딩 문제) 복구
- 단어장 설명 텍스트의 깨진 문자열 판정 강화(`(?? ??? ?? ???)` 유형 포함)
- 운영 스크립트 추가: `npm run wordbooks:cleanup-broken-descriptions`

### 2026-02-19 서비스 반복 점검 루프(5회)
- 방식: `실제 동선 점검 -> 제안 5건 문서화 -> 즉시 코드 반영 -> 커밋/푸시`
- 회차 문서:
  - `docs/service-audit-2026-02-19-loop5/ITERATION_1.md`
  - `docs/service-audit-2026-02-19-loop5/ITERATION_2.md`
  - `docs/service-audit-2026-02-19-loop5/ITERATION_3.md`
  - `docs/service-audit-2026-02-19-loop5/ITERATION_4.md`
  - `docs/service-audit-2026-02-19-loop5/ITERATION_5.md`
- 반영 요약:
  - 오프라인 검색/카운트/빈 상태 분기
  - 오프라인 정렬(최신/오래된/단어 수) + 검색 초기화
  - 마켓 제작자 이메일 검색 + 단어 수 구간 필터
  - 마켓 카드 `차단/신고` 동선 통합
  - 홈 로그인 사용자 빠른 이동(학습/마켓/오프라인) 강화

## 문서

- 반복 점검 운영 프로토콜: `docs/REPEAT_AUDIT_LOOP_PROTOCOL.md`
- 운영/점검/인수인계 문서: `docs/`
- Round 2 계획 문서: `docs/service-audit-2026-02-19-round2/`










