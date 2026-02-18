# PortOne/Railway Handoff (2026-02-19)

## Goal
- Resume and finish PortOne production-ready setup from current state.
- Keep this as the single source of truth for "what is done vs. what remains."

## Completed Today
- PortOne console signup/login completed.
- PortOne `Store ID` confirmed.
- PortOne `API Secret` issued and already set in Railway.
- PortOne Webhook (V2) configured:
  - Endpoint URL set to `https://www.oingapp.com/api/payments/webhook`
  - Webhook secret issued and already set in Railway.
- Railway variables added and deployed:
  - `PORTONE_API_SECRET` (set)
  - `PORTONE_WEBHOOK_SECRET` (set)
  - `PORTONE_STORE_ID` (set)
  - `PORTONE_PRICE_MONTHLY_KRW=2900` (set)
  - `PORTONE_PRICE_YEARLY_KRW=29000` (set)
  - `CRON_SECRET` already existed and remains set
- GitHub Actions secrets confirmed:
  - `APP_BASE_URL` (set)
  - `CRON_SECRET` (set)
- Cron workflow verified successful:
  - `Scheduled Internal Cron Jobs` latest manual runs are successful.

## Not Completed (Blocker)
- `PORTONE_CHANNEL_KEY` is **not set yet**.

### Why Blocked
- PortOne channel creation requires PG test credentials (e.g. MID / secret / client key or PG-specific key set).
- Without those PG credentials, PortOne cannot finish channel creation, so no `CHANNEL_KEY` is generated.

## What To Do Next (Tomorrow)
1. Obtain PG test credentials for one target PG (e.g. TossPayments or KG Inicis).
2. In PortOne:
   - Go to `연동 정보 > 채널 관리 > 테스트`
   - Create channel with the PG credentials
   - Copy generated `CHANNEL_KEY`
3. In Railway:
   - Add `PORTONE_CHANNEL_KEY=<generated value>`
   - Deploy changes
4. Validate payment flow in app:
   - `/pricing` monthly/yearly checkout
   - Success redirect: `/pricing?payment=success`
   - Confirm user plan changes (`plan=PRO`, `proUntil`)
5. Validate cancel flow:
   - Run "구독 갱신 해지"
   - Confirm `/pricing?payment=cancel`
   - Confirm DB `stripeSubscriptionStatus=canceled`
6. Optional sanity checks:
   - `/api/admin/metrics` payment routes
   - Re-run scheduled cron workflow once

## Security Note
- Real secret values are intentionally **not** recorded in this file.
- They are already stored in Railway/GitHub secrets.
