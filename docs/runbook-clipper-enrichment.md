# Clipper Enrichment Runbook

## 1) Agent A로 QUEUED 생성

- 권장 경로: `POST /api/clipper/capture`
- 레거시 호환: `POST /api/clipper/add`
- 정상 저장 시 `WordbookItem.enrichmentStatus=QUEUED`로 생성된다.

예시:

```bash
curl -X POST "$APP_BASE_URL/api/clipper/capture" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"term":"apple","context":"I ate an apple.","wordbookId":123}'
```

## 2) cron endpoint 수동 실행

```bash
curl -X POST "$APP_BASE_URL/api/internal/cron/clipper-enrichment" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"
```

성공 시 요약 필드:

- `picked`: 이번 런에서 선점(클레임) 대상으로 선택된 수
- `succeeded`: `DONE` 전이 건수
- `failed`: `FAILED` 전이 건수
- `durationMs`: 전체 실행 시간(ms)

## 3) 상태 전이 확인 체크포인트

핵심 전이:

- `QUEUED -> PROCESSING -> DONE|FAILED`
- 실패 시 `enrichmentAttempts` 증가 + `enrichmentError` 기록

확인 SQL:

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
LIMIT 50;
```

## 4) 중복 처리 방지 검증

1. `QUEUED` 아이템 3개를 만든다.
2. 같은 시점에 cron을 2회 연속 호출한다.
3. 동일 `id`가 중복으로 `PROCESSING`/`DONE` 되지 않는지 확인한다.

참고: 선점 쿼리는 `WHERE enrichmentStatus='QUEUED'` 조건으로 원자 갱신되므로,
이미 선점된 아이템은 다음 런에서 다시 선점되지 않는다.

## 5) 실패/리트라이 정책 검증

실패 유도 예시(로컬):

- `GEMINI_API_KEY`를 비우거나 잘못된 값으로 설정 후 cron 호출

검증 포인트:

- 실패 아이템의 `enrichmentAttempts`가 증가한다.
- `enrichmentError`에 reason 코드가 기록된다.
- `CLIPPER_ENRICH_MAX_ATTEMPTS` 미만 실패건은 backoff 후 `QUEUED`로 재진입한다.
- 임계치 이상은 `FAILED` 상태로 유지된다.

## 6) 운영 로그 확인

`AppErrorEvent` 확인:

```sql
SELECT id, level, route, message, context, "createdAt"
FROM "AppErrorEvent"
WHERE route = '/api/internal/cron/clipper-enrichment'
ORDER BY id DESC
LIMIT 50;
```

런 요약 로그 키:

- `cron_clipper_enrichment_run_summary`
