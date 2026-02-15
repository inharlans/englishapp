# English 1500 Memorizer

Next.js + Prisma + PostgreSQL based vocabulary trainer.

## Local development

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to a local PostgreSQL connection string.
3. Run:

```bash
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## Railway deployment (recommended)

This repo includes `railway.json`.
The app runs migrations before the web server starts.

### Required environment variables

- `DATABASE_URL` (Railway PostgreSQL or external PostgreSQL)
- `GOOGLE_TRANSLATE_API_KEY` (optional)
- `AUTH_SECRET` (required, 32+ chars recommended)
- `AUTH_BOOTSTRAP_TOKEN` (required for first user creation via bootstrap API)
- `UPSTASH_REDIS_REST_URL` (optional; enable distributed rate limiting)
- `UPSTASH_REDIS_REST_TOKEN` (optional; enable distributed rate limiting)

### Deployment flow

1. Push this repository to GitHub.
2. In Railway: `New Project -> Deploy from GitHub Repo`.
3. Add a Railway PostgreSQL service.
4. Set `DATABASE_URL` on the web service.
5. Open the deployed app URL.

## Prisma scripts

- `npm run prisma:generate`: generate Prisma client
- `npm run prisma:migrate`: local development migration
- `npm run prisma:deploy`: production migration (`migrate deploy`)

## Start command on Railway

```bash
npm run start:railway
```

This command does:

1. `prisma generate`
2. `prisma migrate deploy`
3. `node prisma/seed.js`
4. `next start -p $PORT`

## Auth bootstrap (first admin)

1. Set `AUTH_BOOTSTRAP_TOKEN` and `AUTH_SECRET` in environment variables.
2. Call `POST /api/auth/bootstrap` with header `x-bootstrap-token: $AUTH_BOOTSTRAP_TOKEN` and JSON body:

```json
{ "email": "admin@example.com", "password": "change-me-now" }
```

After that, use `/login` to sign in.

### Bootstrap + Login examples

PowerShell (local dev):

```powershell
$base = "http://127.0.0.1:3000"
$bootstrapToken = $env:AUTH_BOOTSTRAP_TOKEN

Invoke-RestMethod -Method Post "$base/api/auth/bootstrap" `
  -Headers @{ "x-bootstrap-token" = $bootstrapToken } `
  -ContentType "application/json" `
  -Body (@{ email="admin@example.com"; password="change-me-now-123" } | ConvertTo-Json)

# Login (saves cookie in a session variable)
$sess = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-WebRequest -Method Post "$base/api/auth/login" -WebSession $sess `
  -ContentType "application/json" `
  -Body (@{ email="admin@example.com"; password="change-me-now-123" } | ConvertTo-Json) | Out-Null

# Call a protected API using the same session cookie
Invoke-RestMethod -Method Get "$base/api/words?mode=memorize&batch=1&page=0&hideCorrect=true&week=1" -WebSession $sess

# Logout
Invoke-WebRequest -Method Post "$base/api/auth/logout" -WebSession $sess | Out-Null
```

cURL (production):

```bash
BASE="https://your-app.example.com"
BOOTSTRAP_TOKEN="$AUTH_BOOTSTRAP_TOKEN"

curl -sS -X POST "$BASE/api/auth/bootstrap" \
  -H "x-bootstrap-token: $BOOTSTRAP_TOKEN" \
  -H "content-type: application/json" \
  -d '{"email":"admin@example.com","password":"change-me-now-123"}'

# login, store cookie
curl -i -c cookies.txt -X POST "$BASE/api/auth/login" \
  -H "content-type: application/json" \
  -d '{"email":"admin@example.com","password":"change-me-now-123"}'

# use cookie
curl -sS -b cookies.txt "$BASE/api/words?mode=memorize&batch=1&page=0&hideCorrect=true&week=1"

# logout
curl -sS -b cookies.txt -X POST "$BASE/api/auth/logout"
```
