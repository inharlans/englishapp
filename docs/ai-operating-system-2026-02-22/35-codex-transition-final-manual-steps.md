# Codex Transition Final Manual Steps (2026-02-23)

Date: 2026-02-23  
Project: `englishapp`  
Purpose: Close remaining checklist items that require GitHub UI permissions or operator sign-off.

## 1) Branch Protection (GitHub UI)
1. Open repository settings:
   - `https://github.com/inharlans/englishapp/settings/branches`
2. Add or edit protection rule for `main`.
3. Enable required status checks.
4. Add required check:
   - `CI / test`
5. Save rule.

Expected result:
- `main` merge blocked unless `CI / test` is green.

## 2) Deployment + CI Green Evidence
1. Confirm latest CI success for `main`:
   - latest verified run: `22294209290` (passed)
2. Execute one production deployment using current `main`.
3. Capture deployment timestamp and version/commit.
4. Run post-deploy validation:
   - `npm run ops:readiness` (or deployed-environment equivalent)

Expected result:
- Checklist item “At least one deployment executed with CI verify green” can be checked.

## 3) Sign-Off Collection
Collect sign-off from:
1. Platform owner
2. Backend owner
3. Frontend owner
4. Ops owner

Suggested sign-off format:
```text
[ROLE] [NAME] - Approved on 2026-02-23
Scope: Codex transition checklist items reviewed and accepted.
```

## 4) Final Checklist Update
After steps 1-3:
1. Update:
   - `docs/ai-operating-system-2026-02-22/34-codex-runtime-transition-checklist.md`
2. Mark remaining manual items as completed.
3. Commit with message:
   - `docs(ops): finalize codex transition checklist sign-off`

