# 운영 플레이북

## 1) DB 백업 (PostgreSQL)

환경 변수:
- `DATABASE_URL`

전체 백업:

```bash
pg_dump "$DATABASE_URL" --format=custom --file=backup.dump
```

스키마 + 데이터 SQL 백업:

```bash
pg_dump "$DATABASE_URL" --format=plain --file=backup.sql
```

## 2) DB 복구

커스텀 백업 복구:

```bash
pg_restore --clean --if-exists --no-owner --dbname "$DATABASE_URL" backup.dump
```

SQL 복구:

```bash
psql "$DATABASE_URL" -f backup.sql
```

## 3) Prisma 마이그레이션 배포

```bash
npm run prisma:deploy
```

## 4) 마이그레이션 롤백 원칙

- Prisma는 자동 down migration이 기본 제공되지 않습니다.
- 장애 시에는 역방향 SQL 마이그레이션을 새로 만들어 복구합니다.
- 데이터 손실 가능성이 있으면 반드시 `pg_dump`를 먼저 수행합니다.

## 5) 내부 크론 호출

- 엔드포인트:
  - `POST /api/internal/cron/wordbook-rank`
  - `POST /api/internal/cron/plan-expire`
- 인증: `Authorization: Bearer $CRON_SECRET`

예시:

```bash
curl -X POST "https://<your-domain>/api/internal/cron/wordbook-rank" \
  -H "Authorization: Bearer $CRON_SECRET"

curl -X POST "https://<your-domain>/api/internal/cron/plan-expire" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## 6) PortOne 웹훅 연결

- Endpoint: `https://<your-domain>/api/payments/webhook`
- Secret: PortOne 콘솔에서 발급한 웹훅 시크릿을 `PORTONE_WEBHOOK_SECRET`에 저장

필수 PortOne 환경 변수:

- `PORTONE_API_SECRET`
- `PORTONE_WEBHOOK_SECRET`
- `PORTONE_STORE_ID`
- `PORTONE_CHANNEL_KEY`
- `PORTONE_PRICE_MONTHLY_KRW`
- `PORTONE_PRICE_YEARLY_KRW`

## 7) 스케줄러 연결 (GitHub Actions)

레포에 `.github/workflows/cron-jobs.yml`가 포함되어 있으며 30분마다 내부 크론 API를 호출합니다.

필수 GitHub repository secrets:

- `APP_BASE_URL` 예: `https://www.oingapp.com`
- `CRON_SECRET` 앱의 `CRON_SECRET`과 동일 값

수동 점검:

1. GitHub Actions에서 `Scheduled Internal Cron Jobs` 실행
2. 워크플로 성공 로그 확인
3. `/api/admin/metrics`에서 `/api/internal/cron/*` 지표 증가 확인
