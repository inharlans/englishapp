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

1. `prisma migrate deploy`
2. `next start -p $PORT`