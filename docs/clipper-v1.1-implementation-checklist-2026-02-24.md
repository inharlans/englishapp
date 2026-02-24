# 클리퍼 v1.1 구현 체크리스트 (2026-02-24)

## 목표
- `/api/clipper/add`는 즉시 저장만 수행하고 `enrichmentStatus=QUEUED`를 반환한다.
- Gemini 배치 워커가 비동기로 `meaningKo/partOfSpeech/exampleSentenceKo`를 채운다.
- 예문 출처(`SOURCE|AI|NONE`)를 저장하고 UI에서 라벨링한다.
- 중복은 `normalizedTerm` 정확 일치 + DB 유니크로 레이스를 방지한다.

## 확정 사양
- LLM Provider: `gemini`
- 환경변수:
  - `GEMINI_API_KEY`
  - `CLIPPER_LLM_PROVIDER=gemini`
  - `CLIPPER_LLM_MODEL=gemini-2.5-flash-lite`
  - `CLIPPER_ENRICH_BATCH_SIZE=10` (최대 상한 25)
  - `CLIPPER_ENRICH_MAX_WAIT_SECONDS=60`
  - `CLIPPER_ENRICH_MAX_ATTEMPTS=3`
  - `GOOGLE_TRANSLATE_API_KEY` (fallback)
- 용어 통일:
  - 입력: `exampleSentenceEn?`
  - DB: `exampleSentenceEn?`, `exampleSentenceKo?`
  - 출력: `exampleSentenceEn`, `exampleSentenceKo`
- POS enum:
  - `noun|verb|adjective|adverb|phrase|other|unknown`
  - 파싱 실패 시 `unknown`
- 중복 기준:
  - `normalizedTerm` 정확 일치만
  - lemma 통합(`run/runs`) 없음

## 구현 체크리스트

### 1) DB / Prisma
- [ ] `WordbookItem`에 아래 필드 추가
  - [ ] `normalizedTerm`
  - [ ] `meaningKo`
  - [ ] `partOfSpeech`
  - [ ] `exampleSentenceEn`, `exampleSentenceKo`
  - [ ] `exampleSource` (`SOURCE|AI|NONE`)
  - [ ] `enrichmentStatus` (`QUEUED|PROCESSING|DONE|FAILED`)
  - [ ] `enrichmentError`, `enrichmentQueuedAt`, `enrichmentStartedAt`, `enrichmentCompletedAt`, `enrichmentAttempts`
  - [ ] `sourceUrl`, `sourceTitle`
- [ ] `User.defaultWordbookId` 추가
- [ ] 유니크 인덱스 추가: `(wordbookId, normalizedTerm)`
- [ ] 인덱스 추가: `(enrichmentStatus, enrichmentQueuedAt)`, `(wordbookId, enrichmentStatus)`
- [ ] 마이그레이션 SQL 작성 및 기존 데이터 백필

### 2) API - 사용자 설정
- [ ] `GET /api/users/me/clipper-settings` 구현
- [ ] `PATCH /api/users/me/clipper-settings` 구현
  - [ ] `defaultWordbookId`가 로그인 사용자 소유 단어장인지 검증

### 3) API - 클리퍼 저장
- [ ] `POST /api/clipper/add` 구현
- [ ] 입력 검증
  - [ ] `term <= 64`
  - [ ] `exampleSentenceEn <= 500`
- [ ] 단어장 결정 규칙
  - [ ] `wordbookId` 있으면 해당 단어장 소유권 검증(아니면 403)
  - [ ] `wordbookId` 없으면 `defaultWordbookId` 사용
  - [ ] 둘 다 없으면 422
- [ ] 저장 동작
  - [ ] 즉시 저장 + `enrichmentStatus=QUEUED`
  - [ ] queued 시점에 `meaningKo/partOfSpeech/exampleSentenceKo`가 null 가능함을 응답 계약에 반영
- [ ] 중복 처리
  - [ ] 유니크 충돌 시 `{ status:"duplicate", existingItemId }` 반환

### 4) 비동기 워커 / 내부 크론
- [ ] `POST /api/internal/cron/clipper-enrichment` 구현
- [ ] 인증/보안
  - [ ] `CRON_SECRET` 필수
  - [ ] (선택) allowlist 기반 네트워크 제한
- [ ] 큐 선별 정책
  - [ ] user+wordbook 단위 N개(기본 10) 또는 T초(기본 60초)
- [ ] 락 획득 방식
  - [ ] `FOR UPDATE SKIP LOCKED` 또는
  - [ ] `findMany(take=N)` + `updateMany(where status=QUEUED)` 조건부 전환
- [ ] 상태 전환 시도 카운트
  - [ ] `PROCESSING` 전환 시 `enrichmentAttempts += 1`
- [ ] 재시도 규칙
  - [ ] `FAILED` 중 `enrichmentAttempts < MAX_ATTEMPTS` 항목만 재큐잉
  - [ ] 지수 backoff

### 5) Gemini 배치 Enrichment
- [ ] 입력/출력에 `id` 매핑 강제
  - [ ] 입력: `{ id, term, hasSourceExample, exampleSentenceEn? }`
  - [ ] 출력: `{ id, meaningKo, partOfSpeech, exampleSentenceEn, exampleSentenceKo, exampleSource }`
- [ ] 실패 분리 처리
  - [ ] (A) 배치 호출 실패(429/5xx/네트워크): 배치 전체 fallback 시도
  - [ ] (B) 응답 내 특정 id 불량: 해당 id만 FAILED
- [ ] fallback 번역
  - [ ] `GOOGLE_TRANSLATE_API_KEY` 사용
  - [ ] POS는 `unknown`

### 6) 예문 정책
- [ ] SOURCE 우선
  - [ ] 문장 선택 성공 시 `exampleSource=SOURCE`
- [ ] SOURCE 실패 시 AI fallback 허용
  - [ ] `exampleSource=AI`
  - [ ] UI에 `AI 생성 예문` 배지
- [ ] 안전장치
  - [ ] AI 예문 길이 제한(예: 200)
  - [ ] 금칙어/링크/이메일 필터
  - [ ] 위반 시 `exampleSource=NONE`, 예문 비움

### 7) 브릿지/확장
- [ ] 브릿지 페이지(`/clipper/add`) 구현
- [ ] querystring(base64url) 1차 유지
- [ ] 길이 제한 적용
  - [ ] `term<=64`
  - [ ] `exampleSentenceEn<=500` (초과 절단)
- [ ] 2차 옵션 문서화
  - [ ] `postMessage` + origin 검증

### 8) 학습 UI (암기 + 카드)
- [ ] 암기 화면: `예문 보기` 토글 추가
- [ ] 카드 화면: `예문 보기` 버튼/패널 추가
- [ ] 표시 내용
  - [ ] `exampleSentenceEn`, `exampleSentenceKo`, POS
  - [ ] `exampleSource=AI` 시 배지/툴팁

### 9) 관측성/품질
- [ ] 신규 API/크론에 metric 기록
- [ ] 실패 경로 `captureAppError` 기록
- [ ] 테스트
  - [ ] 권한(403), 기본 단어장 미설정(422)
  - [ ] duplicate 응답
  - [ ] 워커 동시성/락
  - [ ] 배치 실패 A/B 분리
  - [ ] AI 예문 필터

## 실행 메모
- 현재 단계: 설계 확정 후 구현 진행 중
- 이 문서를 기준으로 순차 구현 및 체크 업데이트
