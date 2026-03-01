# 성능 병목 실행 순서표/체크리스트 (2026-03-01)

## 실행 순서표

1. 환경 오버헤드 분리 (DB URL baseline vs tuned)
2. 요청 단위 원인 확정 (market/quiz/import)
3. Quiz 선택 쿼리 구조 단순화
4. Import 중복조회 경로 최적화
5. Market 집계/페이지 조회 단일화
6. API 메트릭 기록 비동기화
7. pre-commit 변경 감지 staged-only 전환

## 체크리스트

### 1) 환경 오버헤드 분리
- [x] 로컬 DB 준비: `npm run local:market:setup`
- [x] baseline URL(기존)과 tuned URL(연결 재사용) 비교 측정 스크립트 추가: `scripts/dev/perf-db-url-profile.mjs`
- [x] 측정 결과 확보
  - baseline: `[4146, 2046, 2046, 2076, 2077, 2046]ms`
  - tuned: `[2077, 2, 2, 1, 1, 1]ms`

### 2) 요청 단위 원인 확정
- [x] endpoint 측정 스크립트 추가: `scripts/dev/perf-endpoints.mjs`
- [x] Node20 build/start 기준으로 baseline/tuned 비교 실행
- [x] 측정 신뢰도 보강: warm-up + 반복측정 기본값 상향(`--warmup 5`, `--runs 30`)
- [x] 보고서 JSON 파일 저장(`reports/perf/perf-endpoints-*.json`)
- [x] 결과 확보
  - baseline p95: market `4137.62ms`, quiz `14415.29ms`, import `8385.56ms`
  - tuned p95: market `9.27ms`, quiz `17.01ms`, import `63.44ms`

### 3) Quiz 개선
- [x] 다중 `COUNT+OFFSET` 반복 호출 제거
- [x] 단일 우선순위 선택 쿼리(`pickNextQuizItem`)로 통합

### 4) Import 개선
- [x] 중복 검사 쿼리용 expression index migration 추가
  - `prisma/migrations/20260301063000_word_normalized_expression_index/migration.sql`
- [x] 기존 normalized 조회는 chunk 방식 유지(파라미터 한계 회피), 인덱스 적용으로 조회 비용 완화

### 5) Market 개선
- [x] count/list 이중 쿼리를 집계 기반 쿼리로 정리
- [x] `LATERAL` 반복 count 의존 경로를 집계 서브쿼리 조인으로 전환

### 6) 관측 오버헤드 완화
- [x] `lib/api/metric-response.ts`에서 메트릭 저장을 제한시간(`Promise.race`) 기반으로 처리해 응답 경로 블로킹을 상한화

### 7) 워크플로우 경량화
- [x] `scripts/ops/codex-workflow-guard.js`의 changed-files 수집을 staged-only로 제한

## 검증 명령

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test`
- [x] `npm run build`
- [x] `npm run codex:workflow:check` 실행

최종 상태: `codex:workflow:check` PASS
