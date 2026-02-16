# 운영 플레이북

## 1) DB 백업 (PostgreSQL)

환경 변수:
- `DATABASE_URL`: 애플리케이션 DB 접속 문자열

전체 덤프:

```bash
pg_dump "$DATABASE_URL" --format=custom --file=backup.dump
```

스키마+데이터 SQL 덤프:

```bash
pg_dump "$DATABASE_URL" --format=plain --file=backup.sql
```

## 2) DB 복구

커스텀 덤프 복구:

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

- Prisma는 자동 down migration을 기본 제공하지 않으므로, 롤백은 **새 마이그레이션으로 역변경**을 적용한다.
- 장애 시 즉시 조치 순서:
1. 신규 배포 트래픽 차단/롤백.
2. 장애 유발 마이그레이션 영향 범위 확인(컬럼/인덱스/데이터 변형).
3. 역변경 SQL을 포함한 새 Prisma migration 생성.
4. 스테이징에서 검증 후 운영 반영.
- 데이터 손실 우려가 있는 경우:
1. 현재 상태 백업(`pg_dump`) 선행.
2. 복구 리허설 후 운영 반영.

## 5) 랭킹 재계산 크론

- 내부 엔드포인트: `POST /api/internal/cron/wordbook-rank`
- 인증: `Authorization: Bearer $CRON_SECRET`
- 권장 주기: 하루 1회

예시:

```bash
curl -X POST "https://<your-domain>/api/internal/cron/wordbook-rank" \
  -H "Authorization: Bearer $CRON_SECRET"
```

