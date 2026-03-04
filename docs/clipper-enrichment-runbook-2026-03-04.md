# Clipper Enrichment 점검 시나리오 (운영자용)

## 1) QUEUED 생성
- 방법 A: 앱에서 `POST /api/clipper/capture` 호출(표준, 정상 저장 시 `enrichmentStatus=QUEUED`)
- 방법 A-legacy: 레거시 호환 경로 `POST /api/clipper/add`
- 방법 B: DB에 테스트 데이터 직접 삽입(운영에서는 A 권장)

## 2) 수동 크론 호출
```bash
curl -X POST "$APP_BASE_URL/api/internal/cron/clipper-enrichment" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"
```

성공 응답 예시(핵심 필드):
- `picked`: 이번 런에서 claim한 건수
- `succeeded`: `DONE` 처리 건수
- `failed`: `FAILED` 처리 건수
- `skipped`: 경합/선점 등으로 이번 런에서 건너뛴 건수
- `durationMs`: 런 소요 시간(ms)

## 3) 상태 전이 확인 SQL
```sql
SELECT
  id,
  "enrichmentStatus",
  "enrichmentAttempts",
  "enrichmentError",
  "enrichmentQueuedAt",
  "enrichmentStartedAt",
  "enrichmentCompletedAt"
FROM "WordbookItem"
WHERE "enrichmentStatus" IN ('QUEUED', 'PROCESSING', 'DONE', 'FAILED')
ORDER BY id DESC
LIMIT 20;
```

## 4) 실패/재시도 확인 포인트
- Gemini 실패 시 `FAILED` 전이 + `enrichmentAttempts` 증가 확인
- `enrichmentError`에 reason 코드(`RATE_LIMIT`, `BATCH_FALLBACK_FAILED` 등) 저장 확인
- `CLIPPER_ENRICH_MAX_ATTEMPTS` 미만 실패는 backoff 이후 `QUEUED`로 재진입 가능

## 5) 중복 처리 방지 확인
1. 동일 시점에 크론 엔드포인트를 2회 호출한다.
2. 같은 `id`가 한 런에서만 `picked` 되는지 확인한다.
3. 같은 아이템이 중복 `DONE` 처리되지 않는지 DB에서 확인한다.

## 6) AppErrorEvent 확인(문제 추적)
```sql
SELECT id, level, route, message, context, "createdAt"
FROM "AppErrorEvent"
WHERE route = '/api/internal/cron/clipper-enrichment'
ORDER BY id DESC
LIMIT 50;
```
