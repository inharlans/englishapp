# TODO: Auth Login Policy Follow-up (2026-02-26)

- [ ] Finalize production password-login policy:
  - Decide whether to keep `/api/auth/login` as admin-only or remove fully.
  - Decide if admin email enumeration hardening is needed (uniform response strategy).
- [ ] Add explicit runbook entry for `PASSWORD_LOGIN_DISABLED` monitoring and alert threshold.
- [ ] Add CI smoke test for production-like auth mode (`NODE_ENV=production`) to verify non-admin login is blocked.
