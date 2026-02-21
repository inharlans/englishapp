# Continuous Service Quality Loop (Non-Payment)

## Scope
- Exclude all payment-related pages, APIs, and integrations.
- Focus on UX, accessibility, stability, content clarity, and operational quality.

## Loop Rules
1. For each cycle, discover 10 concrete issues via MCP browser inspection.
2. Document findings and fix plan in docs/service-audit-YYYY-MM-DD-loop/ITERATION_k.md.
3. Implement all 10 fixes in code.
4. Update README with concise change notes.
5. Run typecheck and push to main.
6. Wait 4 minutes after push.
7. Verify Railway deployment success before starting next cycle.

## Acceptance
- Every cycle must complete all 7 steps above.
- Task status must be tracked in Task Master during execution.
