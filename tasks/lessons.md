# Lessons Learned

## Token Efficiency
- **Don't run Playwright with unlimited workers** — saturates CPU, wastes tokens in retry loops. Always use `--workers=4` or less.
- **Don't loop on test results** — if tests pass individually but fail in bulk, it's a resource issue, not a code bug. Diagnose once, fix once.
- **Don't run full E2E suites multiple times** — run targeted tests first, only run full suite once at the end.

## Role Claim Consistency
- **JWT claims use UPPER_CASE**: `ADMIN`, `SUPER_ADMIN`, `VENDEDOR` (set in `JwtTokenGenerator.cs`)
- **All RequireRole() must match**: never use PascalCase (`"Admin"`) — always `"ADMIN"`
- **All HasClaim(Role, ...) must match**: same rule applies in middleware and CurrentTenant

## DB Schema vs EF Core Snapshot
- SQL seed scripts may create tables with fewer columns than the EF model expects
- Always verify actual DB schema matches EF model after adding AuditableEntity inheritance
- Use idempotent migrations (`IF NOT EXISTS`, `IF @col_exists = 0`) for safety

## Planning
- For multi-step tasks, plan first in `tasks/todo.md` before coding
- Don't burn tokens exploring blindly — identify the specific error, fix it, verify, move on
