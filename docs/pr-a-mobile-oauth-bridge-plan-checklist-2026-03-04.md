# PR-A: Mobile OAuth Callback Bridge Plan & Checklist

## Goal

- Stabilize mobile OAuth callback delivery for `google|naver|kakao` in `englishapp` (Next.js App Router).
- Keep provider console redirect URIs as HTTPS callbacks.
- Bridge callback from HTTPS route to app scheme (`englishappmobile://auth/callback`) safely.
- Preserve existing secure flow (`start -> exchange -> refresh` with state/PKCE validation).

## Confirmed Current Behavior (Code Evidence)

- `POST /api/auth/mobile/start` validates `redirectUri`, resolves provider redirect URI, mints signed state, and builds provider authorization URL with `redirect_uri=providerRedirectUri`.
  - File: `app/api/auth/mobile/start/route.ts`
- Google provider redirect URI for OAuth provider call is derived by `resolveProviderRedirectUri(...)` (env/base URL), not blindly from request body.
  - File: `lib/mobileRedirectUri.ts`
- Provider authorization/token exchange functions use the redirect URI argument that routes pass in.
  - File: `lib/mobileOauthProviders.ts`
- Existing callback bridge route already exists for Google and redirects to `claims.redirectUri` from verified state.
  - File: `app/api/auth/mobile/google/callback/route.ts`

## Architecture Decision (PR-A)

- Mobile app callback target: `englishappmobile://auth/callback`
- Provider callback target (console-registered):
  - `https://www.oingapp.com/api/auth/mobile/google/callback`
  - `https://www.oingapp.com/api/auth/mobile/naver/callback`
  - `https://www.oingapp.com/api/auth/mobile/kakao/callback`
- Flow:
  1. App calls `/api/auth/mobile/start` with app callback redirect URI (`englishappmobile://auth/callback`).
  2. Server resolves provider redirect URI (HTTPS callback route).
  3. Provider redirects to HTTPS callback route.
  4. Callback route verifies state and redirects to app scheme with `code/state`.
  5. App calls `/api/auth/mobile/exchange`.

## Contract Clarification (Web Console vs App Scheme)

- Provider console should keep HTTPS callback URIs.
- App scheme must be configured in `englishapp-mobile` (`scheme: englishappmobile`).
- Bridge callback route handles HTTPS -> app scheme redirection; provider does not need to know app scheme.
- For mobile app integration:
  - `startMobileAuth` payload `redirectUri`: app scheme (`englishappmobile://auth/callback`) is allowed and validated.
  - Provider redirect URI is resolved server-side by `resolveProviderRedirectUri(...)` and can be forced to HTTPS via env.
- Operations note: keep `MOBILE_OAUTH_ALLOWED_REDIRECT_URIS` aligned with app-sent redirect URI(s). Provider-facing callback URIs are controlled separately by provider-specific resolver envs.

## Implementation Plan

1. **Callback Routes**
   - Add provider callback bridge routes for `naver` and `kakao` mirroring current Google pattern.
   - Keep Google callback behavior aligned and harden headers (`no-store`).
2. **Route Generalization (Optional in same PR if low-risk)**
   - Consolidate to `app/api/auth/mobile/[provider]/callback/route.ts` with provider allowlist.
   - Keep `google/callback` as compatibility redirect if needed.
3. **Validation Guardrails**
   - Enforce provider allowlist in callback route.
   - Continue strict redirect URI allowlist validation (`assertValidMobileRedirectUri`).
   - Keep exact allowlist for now; consider prefix-based allowlist in follow-up after risk review.
   - Keep state verification mandatory before redirecting to app scheme.
4. **Environment/Config Sync**
   - Ensure production env contains app scheme in `MOBILE_OAUTH_ALLOWED_REDIRECT_URIS`.
   - Confirm provider callback resolver envs resolve to valid HTTPS callback in production:
     - `MOBILE_GOOGLE_OAUTH_REDIRECT_URI`
     - `MOBILE_NAVER_OAUTH_REDIRECT_URI`
     - `MOBILE_KAKAO_OAUTH_REDIRECT_URI`
   - Keep `NEXT_PUBLIC_APP_URL` as fallback base when provider-specific env is omitted.
5. **Mobile App Contract Confirmation**
   - Confirm app scheme is registered in `englishapp-mobile` (`scheme: englishappmobile`).
   - Confirm app passes expected redirect URI to `/mobile/start` and `openAuthSessionAsync` contract remains coherent.

## Required Checklist

- [ ] Add callback bridge for `naver` and `kakao` under `app/api/auth/mobile/**/callback/route.ts`
- [ ] Apply `Cache-Control: no-store` + `Pragma: no-cache` to callback responses
- [ ] Verify callback route does not log `code/state/error_description`
- [ ] Keep `verifyMobileState(state)` guard before redirect to app scheme
- [ ] Ensure redirect destination is validated mobile redirect URI only
- [ ] Validate provider allowlist (`google|naver|kakao`) in callback handler path
- [ ] Confirm mobile app uses `englishappmobile://auth/callback` and scheme is configured
- [ ] Ensure production env includes required redirect URIs
- [ ] Confirm provider console has matching HTTPS callback URIs
- [ ] Run `npm run lint`
- [ ] Run `npm run typecheck`
- [ ] Run `npm run codex:workflow:check`

## E2E Checklist

- [ ] Google: start -> provider login -> `/api/auth/mobile/google/callback` -> app scheme redirect -> exchange success
- [ ] Naver: start -> provider login -> `/api/auth/mobile/naver/callback` -> app scheme redirect -> exchange success
- [ ] Kakao: start -> provider login -> `/api/auth/mobile/kakao/callback` -> app scheme redirect -> exchange success
- [ ] Invalid state reaches callback -> redirected with `error=invalid_state`
- [ ] Tampered redirect URI blocked by allowlist validation
- [ ] Provider mismatch blocked (`AUTH_INVALID_PROVIDER` or equivalent)

## Status Snapshot (Current Branch)

- [x] Added callback bridge routes for `naver` and `kakao`
- [x] Refactored callback bridge logic into shared helper to keep behavior consistent
- [x] Added no-store headers to callback redirects
- [x] Expanded provider redirect resolver support for google/naver/kakao callback HTTPS paths
- [ ] End-to-end verification in staging/mobile devices

## Answers to the Two Critical Questions

1) **How does `start` route use `redirectUri`?**

- `start` validates incoming `parsed.data.redirectUri` with `assertValidMobileRedirectUri`.
- It then computes `providerRedirectUri = resolveProviderRedirectUri({ provider, mobileRedirectUri: parsed.data.redirectUri, requestOrigin })`.
- Finally it builds provider authorization URL using `redirectUri: providerRedirectUri`.
- Therefore, provider-facing `redirect_uri` is `providerRedirectUri` (for Google typically HTTPS callback), not necessarily raw request `redirectUri`.
- Evidence:
  - `app/api/auth/mobile/start/route.ts:34`
  - `app/api/auth/mobile/start/route.ts:35-39`
  - `app/api/auth/mobile/start/route.ts:49-55`

2) **Where does `mobileOauthProviders` get provider redirect URI from?**

- `mobileOauthProviders` does not fetch env redirect URI itself; it receives `redirectUri` as function input and forwards it to provider endpoints.
- The redirect URI source is chosen earlier by route logic (`resolveProviderRedirectUri` in `mobileRedirectUri.ts`).
- For Google, source precedence in resolver is:
  1. `MOBILE_GOOGLE_OAUTH_REDIRECT_URI`
  2. `NEXT_PUBLIC_APP_URL + /api/auth/mobile/google/callback`
  3. (dev fallback) loopback request origin or localhost callback
- Evidence:
  - `lib/mobileOauthProviders.ts:49-69` (auth URL uses input `redirectUri`)
  - `lib/mobileOauthProviders.ts:93-177` (token exchange uses input `redirectUri`)
  - `lib/mobileRedirectUri.ts:132-172` (resolver source precedence)
