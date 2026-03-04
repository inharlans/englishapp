# 마켓 단어장 품질/노출 정책

## 1) 목적

- 마켓 노출 기준을 일관되게 유지해 사용자 신뢰를 확보한다.
- enrichment 품질(`WordbookItem.enrichmentStatus`)을 운영 가능한 규칙으로 반영한다.
- 신고 처리와 숨김 조치 기준을 문서로 고정해 운영 편차를 줄인다.

## 2) 노출 정책

### 2.1 기본 노출 (market 탐색)

아래를 모두 만족하면 기본 목록에 노출 가능:

1. `Wordbook.isPublic = true`
2. `Wordbook.hiddenByAdmin = false`
3. 단어 수가 `MARKET_MIN_ITEM_COUNT` 이상 (현재 100)
4. 제목 차단 키워드 미포함 (`e2e`, `smoke`, `fixture`, `seed`, `test`, `dummy`, `sample`)

### 2.2 curated 노출 (정형/추천 품질)

`quality=curated` 요청일 때 아래를 추가로 만족해야 함:

1. `DONE 비율 >= 0.8`
2. `ratingCount >= 3`

`DONE 비율` 정의:

```text
done_ratio = DONE 아이템 수 / 전체 아이템 수
```

예외 처리:

- 아이템이 0개면 `done_ratio = 0`으로 간주
- 분모 0은 노출 제외

## 3) API 정책

- 엔드포인트: `GET /api/wordbooks/market`
- 쿼리 파라미터:
  - `quality=all|curated`
  - 기본값은 `all` (기존 호환 유지)
- 정책 적용 위치:
  - DB 조회 단계(Repository SQL)에서 필터 적용

## 4) 신고/검수 운영 정책

### 4.1 상태

- `OPEN`: 접수됨, 검토 필요
- `RESOLVED`: 유효 신고로 종료
- `DISMISSED`: 근거 부족/오신고로 종료

### 4.2 관리자 액션

- `review`: 검토중 메모/이력 기록
- `resolve`: 신고 해결 처리
- `dismiss`: 신고 기각 처리
- `hide`: 단어장 `isPublic=false`, `hiddenByAdmin=true`로 전환 + 신고 `RESOLVED`

### 4.3 숨김 기준(운영 가이드)

아래 중 하나 이상이면 `hide` 우선 검토:

1. 불법/유해/저작권 침해 신고가 신뢰 가능한 근거로 확인됨
2. 동일 사유 `OPEN` 신고가 반복되고 사용자 피해가 확인됨
3. 품질 결함(대량 무의미 데이터, 깨진 텍스트)이 심각해 즉시 노출 중단이 필요함

## 5) 운영 점검 쿼리

아래 쿼리는 Postgres 기준이다.

### 5.1 DONE 비율 낮은 단어장 (기본 노출 후보 중)

```sql
WITH item_stats AS (
  SELECT
    wi."wordbookId" AS wordbook_id,
    COUNT(*)::int AS total_count,
    COUNT(*) FILTER (WHERE wi."enrichmentStatus" = 'DONE')::int AS done_count,
    COUNT(*) FILTER (WHERE wi."enrichmentStatus" = 'FAILED')::int AS failed_count
  FROM "WordbookItem" wi
  GROUP BY wi."wordbookId"
)
SELECT
  wb."id",
  wb."title",
  wb."ratingCount",
  s.total_count,
  s.done_count,
  s.failed_count,
  ROUND((s.done_count::numeric / NULLIF(s.total_count, 0)) * 100, 1) AS done_ratio_pct
FROM "Wordbook" wb
JOIN item_stats s ON s.wordbook_id = wb."id"
WHERE wb."isPublic" = true
  AND wb."hiddenByAdmin" = false
  AND s.total_count >= 100
  AND (s.done_count::float / NULLIF(s.total_count, 0)) < 0.8
ORDER BY done_ratio_pct ASC, s.total_count DESC
LIMIT 100;
```

### 5.2 FAILED 비율 높은 단어장

```sql
WITH item_stats AS (
  SELECT
    wi."wordbookId" AS wordbook_id,
    COUNT(*)::int AS total_count,
    COUNT(*) FILTER (WHERE wi."enrichmentStatus" = 'FAILED')::int AS failed_count
  FROM "WordbookItem" wi
  GROUP BY wi."wordbookId"
)
SELECT
  wb."id",
  wb."title",
  s.total_count,
  s.failed_count,
  ROUND((s.failed_count::numeric / NULLIF(s.total_count, 0)) * 100, 1) AS failed_ratio_pct
FROM "Wordbook" wb
JOIN item_stats s ON s.wordbook_id = wb."id"
WHERE wb."isPublic" = true
  AND wb."hiddenByAdmin" = false
  AND s.total_count >= 100
  AND s.failed_count > 0
ORDER BY failed_ratio_pct DESC, s.failed_count DESC
LIMIT 100;
```

### 5.3 OPEN 신고 많은 단어장

```sql
SELECT
  wb."id",
  wb."title",
  COUNT(*)::int AS open_report_count,
  MAX(r."createdAt") AS last_reported_at
FROM "WordbookReport" r
JOIN "Wordbook" wb ON wb."id" = r."wordbookId"
WHERE r."status" = 'OPEN'
GROUP BY wb."id", wb."title"
ORDER BY open_report_count DESC, last_reported_at DESC
LIMIT 100;
```

## 6) Prisma 예시 (운영 스크립트/관리자 작업용)

```ts
import { prisma } from "@/lib/prisma";

const rows = await prisma.$queryRaw<Array<{
  id: number;
  title: string;
  done_ratio_pct: number;
}>>`
WITH item_stats AS (
  SELECT
    wi."wordbookId" AS wordbook_id,
    COUNT(*)::int AS total_count,
    COUNT(*) FILTER (WHERE wi."enrichmentStatus" = 'DONE')::int AS done_count
  FROM "WordbookItem" wi
  GROUP BY wi."wordbookId"
)
SELECT
  wb."id" AS id,
  wb."title" AS title,
  ROUND((s.done_count::numeric / NULLIF(s.total_count, 0)) * 100, 1) AS done_ratio_pct
FROM "Wordbook" wb
JOIN item_stats s ON s.wordbook_id = wb."id"
WHERE wb."isPublic" = true
  AND wb."hiddenByAdmin" = false
  AND s.total_count >= 100
  AND (s.done_count::float / NULLIF(s.total_count, 0)) < 0.8
ORDER BY done_ratio_pct ASC
LIMIT 50;
`;
```

## 7) 운영 체크리스트

### 일일

- [ ] OPEN 신고 상위 목록 확인 (`5.3`)
- [ ] DONE 비율 하위 목록 확인 (`5.1`)
- [ ] FAILED 비율 급증 목록 확인 (`5.2`)

### 주간

- [ ] `quality=curated` 대상 수 추이 점검
- [ ] hide/resolve/dismiss 처리 리드타임 점검
- [ ] 임계치(`0.8`, `ratingCount>=3`) 재조정 필요성 검토

## 8) 롤아웃 원칙

1. 1차: 기본값 `quality=all` 유지 + `quality=curated` 옵트인
2. 2차: 운영 지표 안정 시 curated 기본 전환 검토
3. 3차: 신고/품질 신호 기반 자동 완화(임시 비노출) 검토
