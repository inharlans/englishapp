# Local Debug: Wordbook Market

Back to [AGENTS.md](../AGENTS.md)

Use this flow when you need full local debugging for market and wordbook features.

## 1) Use a local DB

Set `DATABASE_URL` in `.env` to local Postgres.

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/englishapp?schema=public"
AUTH_SECRET="dev-secret-change-me"
LOCAL_AUTH_BYPASS="true"
```

## Quick setup (recommended)

```bash
npm run local:market:setup
```

This command does all of the following:

- Starts local Prisma dev DB
- Builds a stable local `DATABASE_URL` (`pgbouncer=true`, `connection_limit=8`, no `single_use_connections`)
- Applies migrations
- Seeds market-ready local fixtures
- Prints debug login credentials

If you also want to run the app against the same local DB in one step:

```bash
npm run local:market:dev
```

## Manual setup

### 1) Start local Prisma dev DB

```bash
npx prisma dev -d -n englishapp-local --debug
```

### 2) Run migrations on local DB

```bash
DATABASE_URL="postgres://postgres:postgres@localhost:51214/template1?sslmode=disable&pgbouncer=true" npx prisma migrate deploy
```

### 3) Seed local market fixtures

```bash
DATABASE_URL="postgres://postgres:postgres@localhost:51214/template1?sslmode=disable&pgbouncer=true" npm run prisma:seed:local-market
```

This creates or updates:

- Debug login account
  - email: `debug@local.oingapp` (default)
  - password: `debug1234!` (default)
- Sample downloads/ratings/reviews on public market wordbooks
- Refreshed market score fields (`downloadCount`, `ratingAvg`, `ratingCount`, `rankScore`)

## Debug flow

- Even with auth bypass enabled locally, use real login for user-specific checks:
  - downloads
  - my wordbooks
  - ratings/reviews
- Login at `/login`, then verify:
  - `/wordbooks/market`
  - `/wordbooks`
  - `/wordbooks/[id]`
