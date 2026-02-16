# Repository Agent Defaults

## Finish Checklist (Default)

For implementation tasks that change behavior or code:

1. Update `README.md` with concise, user-visible change notes.
2. Commit all related changes with a clear commit message.
3. Push the commit to the current branch on `origin`.

## Exceptions

- If the user explicitly says not to update README, not to commit, or not to push, follow the user request.
- If push fails due to auth/network/remote policy, report the exact failure and stop.
