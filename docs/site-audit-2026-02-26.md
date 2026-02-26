# Site Audit Notes (2026-02-26)

## Scope
- Live walkthrough on `https://www.oingapp.com`
- Checked: `/`, `/pricing`, `/wordbooks/market`, `/wordbooks`, `/offline`, `/login`, `/wordbooks/55`

## Findings

1. Login UX does not match production auth policy
- Severity: High
- Symptom: `/login` still presents email/password form for all users.
- Risk: Users hit blocked flow (`PASSWORD_LOGIN_DISABLED`) and think login is broken.
- Suggested fix:
  - In production, hide password form by default and show OAuth-first copy.
  - Keep password form only for admin/internal paths.
- Candidate files:
  - `app/login/page.tsx`
  - `components/auth/LoginPanel.tsx`
  - `app/api/auth/login/route.ts`

2. Word meaning readability quality is low on detail page
- Severity: High
- Symptom: Meanings shown like `접속사및`, `부사을수록` without spacing/cleanup, long noisy synonym chains.
- Risk: Study quality degradation and trust drop.
- Suggested fix:
  - Add display formatter for `품사 + 뜻` spacing and separator normalization.
  - Truncate/extand on demand for very long meaning strings.
  - Keep raw data, format in view layer first.
- Candidate files:
  - `components/wordbooks/WordbookItemRow.tsx`
  - `components/MeaningView.tsx`
  - `lib/wordbookPresentation.ts` (new formatter suggested)

3. Market card density is too high on mobile and desktop
- Severity: Medium
- Symptom: Very long list with many repeated controls (`신고/차단/평점/다운로드`) per card.
- Risk: Scan speed and conversion drop for actual download/start-study actions.
- Suggested fix:
  - Collapse secondary actions into overflow menu on mobile.
  - Move report/block into detail page primary path.
  - Add compact card mode for market list.
- Candidate files:
  - `app/wordbooks/market/page.tsx`
  - `components/wordbooks/MarketRatingReviews.tsx`

4. Offline page first-paint interaction is confusing
- Severity: Low
- Symptom: On initial load controls are disabled with "불러오는 중..." and then enable.
- Risk: Perceived lag / non-responsive first interaction.
- Suggested fix:
  - Add skeleton placeholders and explicit loading progress copy.
  - Keep refresh button hidden until initial load completes.
- Candidate files:
  - `app/offline/page.tsx`
  - related offline client component(s)

5. Public business info has placeholder value
- Severity: Low
- Symptom: Footer shows `통신판매업 신고번호: 준비 중`.
- Risk: Trust/compliance perception issue on purchase pages.
- Suggested fix:
  - Fill final value from env/config and fail CI if missing in production build.
- Candidate files:
  - footer/business info component
  - production env config

## Follow-up TODO added
- `docs/TODO_2026-02-26_auth-login-policy-followup.md`
