# Englishapp

## 최근 업데이트 (2026-02-24)

- API 구조 리팩터링 11차로 관리자 라우트의 인증/응답 패턴을 `service-response` 헬퍼로 통일해 `admin` API 계층 중복 코드를 정리했습니다.
- API 구조 리팩터링 10차로 결제 라우트 공통 가드/메트릭 패턴을 헬퍼(`lib/api/mutation-route.ts`, `lib/api/metric-response.ts`)로 통합해 `checkout/confirm/portal` 라우트를 단순화했습니다.
- API 구조 리팩터링 9차로 `publish/import/export` 오케스트레이션을 `server/domain/wordbook/content-service.ts`로 이관해 라우트 계층을 더 얇게 정리했습니다.
- API 구조 리팩터링 8차로 `/api/wordbooks/[id]/sync-download` 오케스트레이션을 `server/domain/wordbook/sync-download-service.ts`로 이관해 라우트 책임을 축소했습니다.
- API 구조 리팩터링 7차로 `/api/wordbooks/[id]/download` 오케스트레이션을 `server/domain/wordbook/download-service.ts`로 이관하고, 메트릭 응답 헬퍼(`lib/api/metric-response.ts`)를 도입했습니다.
- API 구조 리팩터링 6차로 `/api/wordbooks/[id]/study/items/[itemId]`의 학습 결과 기록 오케스트레이션을 `server/domain/wordbook/study-item-service.ts`로 이관했습니다.
- API 구조 리팩터링 5차로 `/api/wordbooks/[id]/study`의 DB/캐시 오케스트레이션을 `server/domain/wordbook/study-service.ts`로 이관했습니다.
- API 구조 리팩터링 4차로 `/api/wordbooks/[id]/study`의 쿼리 빌더 로직을 `lib/api/wordbook-study-query.ts`로 분리해 라우트 책임을 축소했습니다.
- API 구조 리팩터링 3차로 잔여 라우트들의 로컬 `parseId`를 제거하고, 인증 반복 로직을 공통 헬퍼(`requireUserFromRequest`)로 정리했습니다.
- API 구조 리팩터링 2차로 단어장 소유권/요금제 수정 가드를 공통 헬퍼(`lib/api/wordbook-guards.ts`)로 추출하고 관련 라우트에 적용했습니다.
- API 구조 리팩터링 계획/체크리스트를 문서화했습니다(`docs/structure-refactor-2026-02-27-plan.md`, `docs/structure-refactor-2026-02-27-checklist.md`).
- 2차 라우트 정리로 `download/publish/sync-download/study-items` 및 일부 admin 라우트까지 공통 파라미터 파싱 헬퍼를 확장 적용했습니다.
- API 라우트 구조 정리를 시작해 공통 헬퍼(`lib/api/route-helpers.ts`)를 추가했고, 일부 단어장 변경 라우트에서 ID 파싱/인증 가드를 재사용하도록 통일했습니다.
- 운영 문서 정리를 진행해 참조되지 않는 아이디어 초안 문서(`docs/ui-ideas`, `docs/ux-ideas`)를 아카이브 대상에서 제거했습니다.
- 운영 문서 정리를 추가 진행해 미참조 감사/제안 문서 묶음(`docs/service-audit-2026-02-19-round2`, `docs/quiz-audit-2026-02-20`, `docs/site-improvement-proposals-2026-02-19`)을 제거했습니다.
- 운영 로그인 정책을 고정했습니다. `NODE_ENV=production`에서 비관리자 비밀번호 로그인은 `403(PASSWORD_LOGIN_DISABLED)`으로 차단되며, 회귀 테스트(`app/api/auth/login/route.test.ts`)를 추가했습니다.
- 운영/개발 환경 분리 템플릿을 추가했습니다(`.env.production.example`, `.env.development.example`). 미들웨어 보호 경로와 일치하도록 `PREVIEW_ACCESS_TOKEN` 키를 환경 템플릿에 반영했습니다.
- PDF/웹 텍스트 선택을 단어장으로 보내는 클리퍼 경로를 추가했습니다.
  - `POST /api/clipper/add`
  - `GET/PATCH /api/users/me/clipper-settings`
  - `POST /api/internal/cron/clipper-enrichment`
- 클리퍼 저장은 즉시 `QUEUED` 상태로 저장하고, 배치 워커가 Gemini 기반 의미/품사/예문 해석을 비동기로 채웁니다.
- 단어 중복 방지를 위해 단어장 단위 정규화 키(`normalizedTerm`)를 추가하고 유니크 인덱스로 레이스를 방어했습니다.
- 학습 UI(암기/카드)에 `예문 보기` 인터랙션을 추가하고, AI 생성 예문은 배지로 구분해 표시합니다.
- 브릿지 페이지(`/clipper/add`)와 크롬 확장 기본 골격(`extension/`)을 추가했습니다.
- 배포 안정화를 위해 `.dockerignore`를 추가해 Docker 빌드 컨텍스트 크기를 줄였습니다.
- Railway Nixpacks 배포 기본 변수(`CLIPPER_LLM_PROVIDER`, `CLIPPER_LLM_MODEL`)를 `nixpacks.toml`에 명시했습니다.
- Railway 배포 안정성을 위해 멀티스테이지 `Dockerfile` 기반 빌드로 전환했습니다(`railway.json` builder=`DOCKERFILE`).
- Docker 빌드에서 Prisma postinstall 실패를 막기 위해 `npm ci` 이전에 `prisma/`를 먼저 복사하고, OpenSSL을 이미지에 설치하도록 조정했습니다.

Englishapp은 영어 학습과 단어장 마켓을 제공하는 웹 애플리케이션입니다.

- 프레임워크: Next.js(App Router)
- 언어/런타임: TypeScript, Node.js
- DB: PostgreSQL + Prisma
- 결제: PortOne
- 핵심 대상 사용자: 한국어 사용자/관리자

## 최근 업데이트 (2026-02-21)

- 차단 목록에서 제작자 이메일 노출을 마스킹 기준으로 통일해 개인정보 노출 범위를 줄였고, 로그아웃 실패 시 `다시 시도`/`로그인 화면 이동` 복구 액션을 제공해 실패 복원력을 높였습니다.
- 전역 PWA 설치 배너 노출 범위를 재조정해 학습 외 화면(`/login`, `/logout`, `/pricing`, `/terms`, `/privacy`, `/admin` 및 하위 경로)에서는 배너를 숨기도록 변경했습니다. 기존 학습 집중 경로 억제 규칙은 유지해 학습 플로우 간섭을 줄였습니다.
- 로그인 페이지 OAuth 오류 처리 로직을 리팩터링해 길게 중첩된 삼항 연산자를 코드-메시지 맵(`OAUTH_ERROR_MESSAGES`) 기반으로 전환했습니다. 동작/메시지는 그대로 유지하면서 유지보수성과 변경 안전성을 높였습니다.
- 전역 네비게이션 루틴을 보강해 로그인 이동 시 `next`에 현재 쿼리까지 보존하도록(`pathname + query`) 수정했고, 숫자 키 페이지 이동(`KeyboardPageNavigator`)은 로그인/로그아웃/약관/개인정보/요금제 화면에서 비활성화해 비학습 화면 오작동을 줄였습니다.
- MCP 실측에서 전역적으로 반복된 manifest 아이콘 경고(`icon-192.png`) 대응을 위해 `public/site.webmanifest`를 정리해 설명 문구 인코딩을 복구하고, 아이콘 경로를 `android-chrome-192x192.png`/`android-chrome-512x512.png` 기준으로 정렬했으며 `scope`를 명시했습니다.
- MCP 실측(`/wordbooks/new`) 기반으로 입력 방식 전환 영역을 `tablist/tabpanel` 구조로 보강하고, 파싱/초기화/업로드 액션의 로딩 중 비활성화 및 수동/검증 테이블 `aria-label`·행 삭제 버튼 라벨을 추가해 생성 플로우 키보드/보조기기 탐색성을 높였습니다.
- MCP 실측(`/wordbooks/blocked`, `/logout`) 기반으로 차단 목록 용어를 `차단`으로 통일하고(제목/설명/빈 상태), KST 차단일 표기·목록 role 구조를 보강했으며, 차단 해제 성공/오류 피드백과 로그아웃 실패 메시지(`aria-live`/`role`)를 추가했습니다.
- MCP 실측에서 `/admin` 접근 시 기본 404만 노출되는 흐름을 확인해 전역 `not-found` 페이지를 추가했고, 홈/내 단어장/마켓/오프라인으로 바로 복귀할 수 있는 CTA와 주소·권한 점검 팁을 제공하도록 보강했습니다.
- MCP 실측(`/login`, `/wordbooks/new`) 기반으로 로그인/단어장 생성 화면의 상태 피드백 접근성을 보강해 Suspense fallback과 상태 문구에 `aria-live`를 추가하고, 로그인/OAuth/생성 오류 문구를 `role=alert`, 제출 버튼 로딩을 `aria-busy`로 통일했습니다.
- MCP 실측(`/pricing`, `/terms`, `/privacy`)에서 정책 페이지 소스 인코딩 깨짐을 확인해 약관/개인정보 문구를 정상 한글로 복구했고, 고객센터 fallback 표기를 `준비 중`으로 통일했으며, 요금제 결제 상태 메시지(`success/cancel`)의 `aria-live`와 FAQ 의미 구조(`dl/dt/dd`)를 보강했습니다.
- MCP 실측(`/wordbooks/market`) 기반으로 마켓 상호작용 컴포넌트를 보강해 리뷰 토글 `aria-controls`/로딩 중복요청 방지/날짜 fallback/상태 메시지 role을 정리하고, 다운로드/차단/신고 버튼의 `aria-busy` 및 신고 상세 글자수 카운터를 추가해 상태 피드백 일관성을 높였습니다.
- MCP 실측(`/offline`, `/offline/wordbooks/[id]`)을 바탕으로 오프라인 학습 키보드 루프를 보강해 `Home/End/0/Enter/M` 단축키, 처음/마지막 카드 버튼, 진행률 `progressbar` 접근성, 뜻 표시 `MeaningView` 통일을 적용했고, 오프라인 라이브러리 검색에는 `/` 포커스·`Esc` 초기화·삭제/새로고침 상태 제어를 추가했습니다.
- MCP 실측(`wordbooks/55`) 기반으로 `/list-*` 파트 통계 경계 계산을 보정해 `600개/15` 케이스가 `41파트`로 보이던 오표시를 수정했고, `/cards` 뜻 표시를 `MeaningView`로 통일해 품사/뜻 가독성을 개선했으며, `/quiz-*` 파트 진행률 `progressbar` 접근성과 파트 점프/건너뛰기 입력 안정성을 보강했습니다.
- 학습 복귀 CTA를 추가 보강해 `마지막 학습 이어서` 버튼에 마지막 탭/파트뿐 아니라 최근 학습 시각(한국 시간)을 함께 표시하고, 학습 탭 클릭 시 마지막 학습 시각을 저장하도록 연결했습니다.
- 상세 페이지의 `마지막 학습 이어서` 버튼을 보강해 마지막 탭뿐 아니라 마지막 파트(`partSize/partIndex`) 컨텍스트까지 복원하고, 카드 탭 비활성 환경에서는 암기 탭으로 자동 fallback되도록 개선했습니다.
- 학습 공통 파트 훅(`useWordbookParting`)을 보강해 브라우저 뒤로/앞으로(`popstate`) 시 URL 쿼리와 파트 상태를 다시 동기화하고, localStorage 접근 실패 환경에서도 예외 없이 동작하도록 안정성을 강화했습니다.
- `/quiz-*` 파트 이동 UX를 추가 보강해 파트 전환 안내/경계 메시지를 키보드와 버튼 모두에 일관 적용하고, `남은 파트/현재 파트 남은 문제` 표시 및 파트 점프 입력값 자동 보정(onBlur clamp)을 반영했습니다.
- 학습 공통 탭(`WordbookStudyTabs`)을 보강해 현재 탭 `aria-current`/접근성 라벨을 추가하고 모바일 가로 스크롤을 지원했으며, 뒤로 링크에서도 `partSize/partIndex` 컨텍스트를 유지하도록 개선했습니다.
- `/list-*` 흐름도 보강해 모바일 파트 선택 드롭다운, `처음/마지막` 파트 이동 버튼, 경계 이동 메시지(첫/마지막 파트), 상태 메시지 자동 정리, 남은 파트 수 표시를 추가했습니다.
- `/quiz-*`에도 연속 풀이 개선을 적용해 답안 임시저장/복원, 정답 시 자동 다음 옵션(저장/토글), 파트 `처음/마지막` 이동 버튼, 경계 이동 메시지 및 상태 메시지 자동 정리를 추가했습니다.
- `/cards` 외에도 `/memorize`를 보강해 페이지 크기/페이지 위치를 로컬에 저장·복원하고, `Home/End` 및 `처음/마지막` 페이지 이동 버튼, 필터 결과 요약, 경계 이동 메시지/자동 정리를 추가했습니다.
- 카드 학습에 자동 발음 옵션을 추가해 카드 전환 시 단어를 자동으로 읽어주도록 했고(`V` 단축키/토글 버튼), 사용자 설정을 로컬에 저장·복원해 반복 학습 시 핸즈프리 흐름을 지원하도록 개선했습니다.
- 카드 학습 키보드 루프를 정리해 `M`(뜻 토글), `0`(첫 카드 이동)을 추가하고, 파트 경계 이동 메시지/자동 메시지 정리를 도입해 반복 학습 중 상태 피드백 과밀을 줄였습니다.
- 카드 학습에 자동 다음 파트 이동 옵션을 추가해 마지막 카드에서 다음 파트로 자동 전환할 수 있게 했고(`A` 단축키/토글 버튼), 남은 카드·남은 파트 지표를 함께 노출해 파트 루프 진행 상태를 더 명확히 확인할 수 있게 했습니다.
- 카드 `이어보기` 정확도를 높이기 위해 파트별 셔플을 시드 기반으로 고정하고(시드 저장/복원), 이어보기 복원도 인덱스 우선이 아니라 카드 ID 매칭 우선으로 바꿔 데이터 변동 시에도 동일 카드 위치 복원률을 높였습니다.
- 카드 학습에 `이어보기`를 추가해 파트별 마지막 카드 위치/뜻 표시 상태를 로컬에 저장·복원하고, 이어보기 on/off 및 현재 파트 이어보기 초기화 버튼을 제공하도록 개선했습니다.
- 카드 학습에서 파트 마지막 카드 도달 시 완료 상태 카드를 노출하고, `현재 파트 다시 섞기`와 `다음 파트로 이동` 액션을 추가했으며, `P`/`N` 키로 이전/다음 파트 이동을 지원하도록 보강했습니다.
- 카드 학습 상호작용을 추가 보강해 `Enter` 뜻 토글, `Esc` 뜻 숨기기, 파트/카드 `처음·마지막` 이동, 전체 기준 위치 표시(`x/y`)를 추가하고, 빈 파트에서 전체 진행률 계산이 어긋나는 케이스를 수정했습니다.
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

4. Codex 로컬 게이트 설치(최초 1회)
```bash
npm run codex:hooks:install
git config --get core.hooksPath
```

기대값:
- `git config --get core.hooksPath` 출력이 `.githooks`
- 커밋 시 `hooks:validate` + `verify`가 자동 실행됨

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
powershell -ExecutionPolicy Bypass -File scripts/ops/auto-loop-runner.ps1 -IntervalMinutes 5 -CycleCommand "npm run typecheck"
```

예시(체인 명령 + 타임아웃/연속실패/로그):
```powershell
powershell -ExecutionPolicy Bypass -File scripts/ops/auto-loop-runner.ps1 -IntervalMinutes 5 -CycleCommand "npm run typecheck && npm test" -TimeoutMinutes 8 -MaxConsecutiveFailures 2 -LogPath ".\auto-loop.log"
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

## 문서

- 반복 점검 운영 프로토콜: `docs/REPEAT_AUDIT_LOOP_PROTOCOL.md`
- 운영/점검/인수인계 문서: `docs/`
- 반복 점검 이터레이션 문서는 저장소 경량화를 위해 정리되었습니다.
## Auth Policy (Production)
- OAuth-first login is enforced for regular users.
- `/api/auth/login` is blocked for non-admin users with `403` and `code: PASSWORD_LOGIN_DISABLED`.
- Local/development keeps password login for debugging and operations.
