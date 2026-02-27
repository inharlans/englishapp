# 운영 플레이북

## 1) DB 백업 (PostgreSQL)

환경 변수:
- `DATABASE_URL`

커스텀 포맷 백업:

```bash
pg_dump "$DATABASE_URL" --format=custom --file=backup.dump
```

SQL 백업:

```bash
pg_dump "$DATABASE_URL" --format=plain --file=backup.sql
```

## 2) DB 복구

커스텀 포맷 복구:

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

- Prisma는 자동 down migration을 기본 제공하지 않습니다.
- 롤백이 필요하면 별도의 SQL 마이그레이션으로 복구합니다.
- 데이터 손실 가능성이 있으면 반드시 `pg_dump`를 먼저 수행합니다.

## 5) 내부 크론 수동 호출

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

레포지토리의 `.github/workflows/cron-jobs.yml`이 30분마다 내부 크론 API를 호출합니다.

필수 GitHub repository secrets:

- `APP_BASE_URL` 예: `https://www.oingapp.com`
- `CRON_SECRET` 앱의 `CRON_SECRET`과 동일 값

점검 순서:

1. GitHub Actions에서 `Scheduled Internal Cron Jobs` 수동 실행
2. 워크플로 로그에서 성공 여부 확인
3. `/api/admin/metrics`에서 `/api/internal/cron/*` 지표 증가 확인

## 8) 로그인 정책 모니터링 (PASSWORD_LOGIN_DISABLED)

- 정책 요약:
  - `NODE_ENV=production`에서는 비관리자 이메일의 비밀번호 로그인을 차단합니다.
  - 차단 응답: `403`, `code: PASSWORD_LOGIN_DISABLED`
  - 운영 로그 이벤트: `password_login_disabled_attempt`
- 기본 알림 임계치(권장):
  - 최근 10분 동안 `password_login_disabled_attempt`가 20건 이상이면 경고
  - 최근 10분 동안 50건 이상이면 긴급
- 점검 포인트:
  - OAuth 공급자 장애가 없는데 차단 이벤트가 급증하면 로그인 안내 문구/진입 경로를 점검
  - 관리자가 비밀번호 로그인을 사용해야 하는 환경이면 admin 계정 이메일 설정을 재확인
