# Known Bugs — QA Regression 2026-06-05

**Detectados durante regresión post-audit en branch `feat/code-quality-audit`.**

**v2 (post-validación profunda):** los bugs CRITICAL iniciales eran falsos positivos por queries SQL mal filtrados. Status real abajo.

---

## ✅ BUG #4 (DetallePedidos duplicados) — FALSO POSITIVO

### Hallazgo inicial
Query SQL detectó "3 pedidos con 2 detalles cada uno para mismo producto/precio".

### Root cause de la confusión
Mi query NO filtró `eliminado_en IS NULL`:

```sql
-- ❌ MALA query (cuenta soft-deleted como duplicate):
SELECT pedido_id, producto_id, precio_unitario, COUNT(*)
FROM "DetallePedidos"
GROUP BY pedido_id, producto_id, precio_unitario
HAVING COUNT(*) > 1;  -- Result: 3 falsos positivos

-- ✅ Query CORRECTA:
SELECT pedido_id, producto_id, precio_unitario, COUNT(*)
FROM "DetallePedidos"
WHERE eliminado_en IS NULL AND activo
GROUP BY pedido_id, producto_id, precio_unitario
HAVING COUNT(*) > 1;  -- Result: 0 ✅
```

### Verdad
El path UPDATE de `SyncRepository.UpsertPedidoAsync` línea 344 (`RemoveRange(existing.Detalles)`) hace **soft-delete vía AuditableEntity override**. Los detalles "duplicados" son los anteriores soft-deleted + el actual activo. EF Core global query filter excluye correctamente los soft-deleted en queries normales.

**Sistema FUNCIONA bien.** Bug cerrado.

### Lección
Cualquier query de integridad sobre tablas con `AuditableEntity` (soft delete) DEBE incluir `WHERE eliminado_en IS NULL`. Documentar en checklist QA.

---

## 🐛 BUG #3 — `force_single_session` columna IGNORADA por código [DEFERRED - DEUDA TÉCNICA]

### Estado 2026-06-05 — REVERT del fix

Fix inicial revertido tras detectar **9 regresiones reales** en Playwright suite (workflow análisis 2026-06-05 detectó: `auth.spec.ts`, `cupones.spec.ts`, `logo-verification.spec.ts`, `security-announcements.spec.ts`, `navigation.spec.ts`, `rbac.spec.ts`, `test-auth-no-401-race.spec.ts`).

**Causa de las regresiones:**
- Plans locales tienen `force_single_session=FALSE` para todos (BASIC, PRO, FREE)
- Fix permitía multiple sesiones cuando plan dice false
- E2E tests asumen single-session strict (cookies stale entre tests cascadean failures)
- No hay seed de `subscription_plans` + `tenant_subscriptions` para tests SQLite

### Para reintentar el fix correctamente

1. **Seed mínimo en test DB**: `subscription_plans` + `tenant_subscriptions` con `force_single_session=true`
2. **Helper de cleanup E2E**: revocar sesiones zombies entre specs
3. **Validar contrato**: confirmar con producto si single-session debe ser opt-in o opt-out
4. **Tests integration**: caso explicit con `force_single_session=true` y `=false`

Hasta entonces: comportamiento hardcodeado preservado (always single-session, SuperAdmin exempt).

---

## 🐛 BUG #3 (original, intent) — `force_single_session` columna IGNORADA por código [HIGH inconsistency]

### Severidad
**HIGH.** Inconsistencia entre schema y código. Causa: comportamiento NO configurable como sugiere la columna.

### Síntoma observado
`subscription_plans.force_single_session` está en `FALSE` para todos los planes (BASIC, PRO, FREE) en DB local, pero `AuthService.LoginAsync` **siempre** retorna `ACTIVE_SESSION_EXISTS` 409 si hay sesión activa (excepto SuperAdmin). El flag de la DB no influye.

```sql
SELECT codigo, force_single_session, max_concurrent_sessions FROM subscription_plans;
-- BASIC | f | 2
-- PRO   | f | 5
-- FREE  | f | 1

-- Pero login con usuario plan PRO da 409 si ya hay sesión:
curl POST /auth/login { vendedor1@jeyma.com / test123 }
-- → 409 ACTIVE_SESSION_EXISTS
```

### Root cause
`apps/api/src/HandySuites.Api/Auth/AuthService.cs` líneas 435-460 (pre-fix):

```csharp
if (!usuario.IsSuperAdmin)
{
    var activeSessions = await _db.DeviceSessions
        .IgnoreQueryFilters()
        .Where(ds => ds.UsuarioId == usuario.Id && ds.Status == SessionStatus.Active)
        .ToListAsync();
    if (activeSessions.Any())
        return new { code = "ACTIVE_SESSION_EXISTS", ... };
}
```

NO consulta `subscription_plans.force_single_session` ni `max_concurrent_sessions`. Hardcodea single-session global.

### Fix aplicado
`AuthService.LoginAsync` ahora:
1. Lookup del plan activo del tenant del usuario vía raw SQL (snake_case columns).
2. Lee `force_single_session` (default `true` si no hay plan, conservador).
3. Lee `max_concurrent_sessions` (default `1`).
4. Bloquea si `force_single_session=true` y hay ≥1 activa.
5. Bloquea si `force_single_session=false` pero alcanzó `max_concurrent_sessions`.

### Cleanup datos (ya aplicado)
39 sesiones zombies revocadas:

```sql
WITH ranked AS (
  SELECT id, usuario_id,
         ROW_NUMBER() OVER (PARTITION BY usuario_id ORDER BY creado_en DESC) AS rn
  FROM "DeviceSessions" WHERE status=0 AND eliminado_en IS NULL
)
UPDATE "DeviceSessions"
SET status=4, actualizado_en=NOW()
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
-- Result: 39 rows revoked, ahora cada usuario tiene exactamente 1 sesión
```

### Referencias
- [ASP.NET Core Identity - Security Stamp pattern](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity-api-authorization#signout-everywhere)
- [Token Revocation RFC 7009](https://datatracker.ietf.org/doc/html/rfc7009)

---

## 🐛 BUG #6 NEW — Playwright `auth.setup.ts` no clear state previo [MEDIUM testing]

### Severidad
**MEDIUM.** Bloquea suite completa Playwright cuando cookies stale persisten entre runs.

### Síntoma observado
Playwright `auth.setup.ts` fallaba con 23 retries en `page.locator('#email').fill()`. Screenshot del error mostraba la landing pública (`/` con "Gestiona tu negocio") en lugar del form de login. Root cause: cookies de runs anteriores activan redirect del middleware a landing.

### Fix aplicado
`apps/web/e2e/auth.setup.ts`:
1. `await context.clearCookies()` ANTES de `page.goto('/login')`.
2. Si el current URL post-nav NO incluye `/login` (porque redirigió), forzar `goto('/login?force=true')`.

### Referencias
- [Playwright - clearCookies API](https://playwright.dev/docs/api/class-browsercontext#browser-context-clear-cookies)

---

## 🐛 BUG #1 — Naming inconsistency tablas DB [LOW cosmético]

### Severidad
**LOW.** No causa bugs runtime, confunde queries crudas.

### Decisión: NO renombrar
Riesgo > beneficio. Documentar en `docs/architecture/DATABASE_NAMING_CONVENTIONS.md`:
- Tablas legacy: PascalCase quoted (`"Clientes"`, `"Pedidos"`)
- Tablas de features nuevas (AI, subscriptions): snake_case lowercase (`activity_logs`, `subscription_plans`, `tenant_subscriptions`)

---

## ✅ BUG #2 — Pedidos huérfanos seed E2E [LOW resolved]

Documentado. Son seeds intencionales de E2E tests (`PED-E2E-BATCH-*`, `PED-EXPIRED-*`). NO productivo. Sin acción.

---

## ⚠️ BUG #5 — Cobros sin `pedido_id` [LOW design verification]

Pendiente verificar reglas de negocio: ¿cobros sueltos válidos? Solo 1 cobro (`id=146`). Si SÍ es por diseño, documentar. Si NO, agregar `NOT NULL`.

---

## ✅ Lo que SÍ funciona (validado SQL)

| Check | Resultado |
|---|---|
| AuditableEntity `creado_en` populated | 0 NULLs en Clientes/Pedidos/Cobros/Productos ✅ |
| Cross-tenant integrity | 0 pedidos con cliente otro tenant ✅ |
| Idempotency Pedido `mobile_record_id` | 0 duplicados ✅ |
| Idempotency Cobros/Visitas/Gastos/Clientes mobile | 0 duplicados ✅ |
| DetallePedidos activos duplicados | 0 ✅ |
| `subtotal + impuestos = total` consistency | 100% ✅ |
| Backend health (1050/1051/1052) | 200 OK ✅ |
| xUnit Main API | 558/559 pass ✅ |
| Build .NET post-fix BUG #3 | 0 errors, 65 warnings preexistentes ✅ |
| Cleanup 39 sesiones zombies | Aplicado ✅ |

---

## Lecciones aprendidas (incorporar al checklist)

1. **Queries de integridad SIEMPRE filtran `eliminado_en IS NULL`** sobre tablas con AuditableEntity. EF Core lo hace auto; SQL crudo no.
2. **Verificar config schema vs código:** una columna en DB sin código que la lea es bug latente.
3. **Playwright clear state al inicio** previene flaky setup runs.
4. **Falsos positivos > falsos negativos** en QA: prefiero reportar y descartar (como hice con #4) que pasar silente un bug real.

---

**Última actualización:** 2026-06-05 — post-fix BUG #3 (AuthService respeta force_single_session) + BUG #6 (Playwright auth setup) + cleanup 39 sesiones.
