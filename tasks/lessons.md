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

## Impersonation — Mismatch entre queries (Feb 2026)
- **Root cause**: `GetActiveSessionForUserAsync` retorna sesiones con Status="ACTIVE" sin verificar ExpiresAt. `GetCurrentStateAsync` SÍ verifica ExpiresAt y auto-expira. Esto causaba "Ya tienes sesión activa" para sesiones vencidas.
- **Fix**: `StartSessionAsync` ahora auto-expira sesiones vencidas en lugar de rechazar con 400.
- **Lección**: Cuando múltiples métodos consultan la misma entidad, verificar que TODOS aplican las mismas condiciones de filtrado (Status + ExpiresAt). Un query inconsistente = bug silencioso.

## E2E Tests — Locators en páginas responsivas
- **Problema**: `getByText('Demo Corp')` resuelve a 2 elementos (tabla desktop + cards mobile) → strict mode violation.
- **Fix**: Siempre usar `.first()` cuando el texto puede aparecer en ambas vistas.
- **Lección**: Las páginas responsivas con tabla + cards duplican texto. Cualquier locator por texto necesita `.first()`.

## E2E Tests — Impersonation endpoint URL
- **Problema**: `ImpersonationEndpoints` usa `MapGroup("/impersonation")` sin prefijo `/api/`.
- **Lección**: Verificar el MapGroup real antes de hardcodear URLs en tests. Usar `curl` rápido para confirmar (401 = existe, 404 = URL incorrecta).

## Workflow — Verificar ANTES de commitear
- **Error cometido**: Committeé sin correr `dotnet test` para verificar que el cambio en ImpersonationService.cs no causa regresiones.
- **Regla**: Backend changes → `dotnet test` → frontend E2E → commit. Nunca saltar pasos.

## E2E — Playwright Setup Project Pattern (Feb 2026)
- **StorageState breaks login tests**: Tests that verify login/redirect flow MUST use `test.use({ storageState: { cookies: [], origins: [] } })` to clear the pre-loaded admin cookies
- **workers=undefined is dangerous**: On 20-core machine, undefined = 10 workers. Dev server (Next.js + .NET API) can't handle 10 simultaneous browsers. Max 4 workers for stability.
- **email_verificado=1 is mandatory**: Seed users without this column default to 0, causing redirect to /verify-email instead of /dashboard
- **Single-session enforcement blocks parallelism**: Multiple files logging in as same SA/vendedor user simultaneously = session_version conflicts. Either dedicate users per file or run those tests in serial project.
- **Fast-path cookie detection**: Check for `session-token` or `next-auth` in cookie names. If present, skip login form → just navigate to /dashboard. If stale, fall through to full login.
- **clearCookies() before role switch**: loginAsVendedor/loginAsSuperAdmin must clear admin storageState cookies before logging in as a different user.

## E2E — Maintenance Mode es estado global (Feb 2026)
- **Problema**: El modo mantenimiento es un flag global en `GlobalSettings`. Cuando un test lo activa, TODOS los requests de otros tests en paralelo reciben 503.
- **Cascade bug**: Borrar un anuncio tipo Maintenance vía `DELETE /api/superadmin/announcements/{id}` auto-desactiva mantenimiento en el backend (además de expirar el anuncio). Cualquier cleanup que borre anuncios puede accidentalmente desactivar mantenimiento.
- **Cache 15s**: `MaintenanceMiddleware` cachea el estado por 15 segundos. La activación/desactivación limpia el cache explícitamente (`cache.Remove()`), pero requests concurrentes pueden repopular el cache con estado viejo.
- **Fix**: Para tests que dependen de mantenimiento activo, usar retry loop que re-activa mantenimiento si fue desactivado por cleanup paralelo. Para tests que activan mantenimiento en UI, re-intentar activación si la página no muestra "ACTIVO".
- **Regla**: Nunca asumir que un estado global (mantenimiento, feature flags) persiste entre API call y UI assertion cuando hay tests paralelos.

## E2E — Serial mode + retries consume budget
- **Problema**: Con `mode: 'serial'` a nivel de archivo, si un test falla, todos los siguientes son interrumpidos. Los retries (2) re-ejecutan TODO el bloque serial.
- **Consecuencia**: Un test flaky al inicio consume retries, dejando 0 intentos para tests posteriores.
- **Fix**: Hacer tests tempranos en el bloque serial lo más robustos posible (retry loops internos). Tests API-only que no dependen de UI serial deberían idealmente estar en describes separados.

## E2E — Mobile botones icon-only
- **Problema**: En viewport mobile (Pixel 5), botones de acción muestran solo `<img>` sin texto. `getByRole('button', { name: /texto/i })` no encuentra nada.
- **Fix**: Skip con `if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }` para tests que verifican texto de botones.
- **Alternativa**: Usar `locator('button').filter({ has: page.locator('img[alt*="texto"]') })` si los íconos tienen alt text.
