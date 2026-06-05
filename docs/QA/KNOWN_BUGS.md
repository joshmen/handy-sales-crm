# Known Bugs — Hallazgos de QA regression 2026-06-05

**Detectados durante regresión post-audit en branch `feat/code-quality-audit`.**
**Estado:** documentados con root cause + propuesta de fix + referencias context7. Sin implementar — esperando validación manual del usuario antes de aplicar cambios.

---

## BUG #4 — `DetallePedidos` duplicados por sync mobile [CRITICAL]

### Severidad
**CRITICAL.** Data integrity. Cliente cobra mal, pedido luce con totales correctos pero detalles internos están duplicados.

### Síntoma observado (DB staging local)
3 pedidos con detalles duplicados (mismo `producto_id` + `precio_unitario` repetido):

```sql
-- Query que detecta el bug
SELECT pedido_id, producto_id, precio_unitario, COUNT(*) AS rows
FROM "DetallePedidos"
GROUP BY pedido_id, producto_id, precio_unitario
HAVING COUNT(*) > 1;

-- Resultado en local:
-- pedido_id=250 producto_id=5 precio=5 rows=2
-- pedido_id=248 producto_id=5 precio=5 rows=2
-- pedido_id=246 producto_id=5 precio=5 rows=2
```

Detalle de los duplicados de pedido 250:

```
id   pedido_id  producto_id  cantidad  precio  subtotal  impuesto  total  mobile_record_id  creado_en
220  250        5            3         5       15        0         15     NULL              19:52:08.309
221  250        5            3         5.00    12.93     2.07      15.00  1B1nvF7dzeCF8srp  19:52:08.909
```

### Root cause hipótesis
El backend procesa el pedido por dos rutas:

1. **Primer save** (sin `mobile_record_id` en los detalles) — probablemente eager-save o sync push inicial donde los detalles no llevan `LocalId`. Crea Pedido + detalles con `Impuesto=0`.
2. **Segundo sync push** (con `mobile_record_id` en los detalles) — `SyncRepository.UpsertPedidoAsync` línea 400-410: idempotency check a nivel PEDIDO (por `mobile_record_id` padre) → `return early`. **PERO** los detalles entrantes con `LocalId` se insertan vía otra ruta o el path de creación inicial.

**Punto de falla:**
- `SyncRepository.cs:400-410` — el check de idempotency es solo por Pedido.MobileRecordId.
- Los detalles NO tienen check de idempotency individual.
- `LineAmountCalculator` produce valores ligeramente distintos en cada path (server-side recalc) → resultando en 2 filas con cálculos divergentes pero `total` final coincidente.

### Propuesta de fix
**Opción A (RECOMENDADA):** Agregar identity resolution a los detalles usando `ChangeTracker.TrackGraph` antes de SaveChanges.

Pattern oficial EF Core ([docs](https://learn.microsoft.com/en-us/ef/core/change-tracking/identity-resolution#handling-duplicates)):

```csharp
// En UpsertPedidoAsync, ANTES de _db.SaveChanges():
foreach (var detalle in entrantesDetalles)
{
    _db.ChangeTracker.TrackGraph(detalle, node =>
    {
        var keyValue = node.Entry.Property("MobileRecordId").CurrentValue;
        var entityType = node.Entry.Metadata.ClrType;
        var existing = _db.ChangeTracker.Entries()
            .FirstOrDefault(e => Equals(e.Metadata.ClrType, entityType)
                && Equals(e.Property("MobileRecordId").CurrentValue, keyValue));
        if (existing != null && keyValue != null)
        {
            // Duplicate detalle by MobileRecordId — discard
            return;
        }
        node.Entry.State = EntityState.Added;
    });
}
```

**Opción B:** Simplificar el contrato del eager-save.

El eager-save endpoint debería crear **SOLO el Pedido shell** (sin detalles). Los detalles se crean siempre via sync push regular con `LocalId`. Cero ambigüedad sobre cuál ruta inserta detalles.

**Opción C:** Idempotency constraint en DB.

Agregar índice único:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS ux_detalle_pedido_mri
ON "DetallePedidos" (mobile_record_id) WHERE mobile_record_id IS NOT NULL;
```

Si se intenta insertar un detalle con `mobile_record_id` que ya existe → 23505 violation → el sync engine debe handle como `wasConflict` y retomar el detalle existente.

**Cleanup de datos actuales:**
```sql
-- Identificar duplicados (mantener fila CON mobile_record_id, eliminar la sin MRI)
WITH dups AS (
  SELECT pedido_id, producto_id, precio_unitario,
         MIN(id) FILTER (WHERE mobile_record_id IS NULL) AS keep_or_delete_id
  FROM "DetallePedidos"
  GROUP BY pedido_id, producto_id, precio_unitario
  HAVING COUNT(*) > 1
)
UPDATE "DetallePedidos" SET eliminado_en = NOW(), eliminado_por = 'qa-cleanup-bug4'
WHERE id IN (SELECT keep_or_delete_id FROM dups WHERE keep_or_delete_id IS NOT NULL);
```

### Referencias
- [EF Core - Resolving duplicates with TrackGraph](https://learn.microsoft.com/en-us/ef/core/change-tracking/identity-resolution#handling-duplicates)
- [EF Core - Disconnected entities patterns](https://learn.microsoft.com/en-us/ef/core/saving/disconnected-entities)
- [WatermelonDB Sync - Conflict resolution patterns](https://watermelondb.dev/docs/Sync/Frontend#conflict-resolution)

---

## BUG #3 — Single-session enforcement acumula sesiones [HIGH security]

### Severidad
**HIGH.** Contradice el contrato de single-session strict declarado en CLAUDE.md. Posibilita session token theft sin detección.

### Síntoma observado (DB local)
```sql
SELECT id, usuario_id, device_name, status, creado_en
FROM "DeviceSessions" WHERE status=0
ORDER BY creado_en DESC LIMIT 10;
```

Resultado: `usuario_id=39` tiene **5+ sesiones simultáneas con status=0 (Active)** en últimos minutos. Esperado: máximo 1 por usuario.

### Root cause hipótesis
`MobileAuthService.LoginAsync` (`apps/mobile/.../MobileAuthService.cs`) crea nueva sesión sin invocar revocación atómica de las anteriores cuando `ForceSingleSession=true` en el plan del tenant.

El check actual probablemente:
- Cuenta sesiones activas, si `>=maxSessions` retorna 409 `SESSION_BLOCKED`
- PERO no hay path que revoque automáticamente al hacer login fresco
- Solo hay path manual via `forceLogin` endpoint

Esto rompe el patrón "Security Stamp" recomendado por ASP.NET Core docs: cualquier security-sensitive event (login fresh, password change, role change) debe invalidar tokens previos.

### Propuesta de fix
**Refactor `MobileAuthService.LoginAsync`:**

```csharp
public async Task<LoginResult> LoginAsync(LoginDto dto, ...)
{
    // ... validate credentials ...

    // Sprint audit fix BUG #3: revoke ALL previous active sessions for this user
    // ANTES de crear la nueva. Pattern: "Security Stamp" de ASP.NET Core.
    if (subscriptionPlan.ForceSingleSession)
    {
        var activeSessions = await _db.DeviceSessions
            .Where(s => s.UsuarioId == user.Id && s.Status == DeviceSessionStatus.Active)
            .ToListAsync();

        foreach (var oldSession in activeSessions)
        {
            oldSession.Status = DeviceSessionStatus.Revoked;
            oldSession.RevokedAt = DateTime.UtcNow;
            oldSession.RevokedReason = "single_session_new_login";
            // Broadcast via SignalR para que el device anterior haga logout automatico
            await _hub.Clients.Group($"user-{user.Id}").SendAsync("SessionRevoked", oldSession.Id);
        }

        // Revoke all refresh tokens of the user
        var oldTokens = await _db.RefreshTokens.Where(t => t.UsuarioId == user.Id && !t.Revoked).ToListAsync();
        foreach (var t in oldTokens) t.Revoked = true;

        await _db.SaveChangesAsync();
    }

    // Now create new session + refresh token
    // ...
}
```

**Cleanup datos actuales:**
```sql
-- Mantener solo la sesion MAS RECIENTE por usuario, revocar resto
WITH ranked AS (
  SELECT id, usuario_id,
         ROW_NUMBER() OVER (PARTITION BY usuario_id ORDER BY creado_en DESC) AS rn
  FROM "DeviceSessions" WHERE status=0
)
UPDATE "DeviceSessions"
SET status=4, revoked_at=NOW(), revoked_reason='qa-cleanup-bug3'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
```

### Referencias
- [ASP.NET Core Identity - Security Stamp pattern](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity-api-authorization#signout-everywhere)
- [ASP.NET Core - Refresh token revocation](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity-api-authorization#post-refresh)
- [Token Revocation RFC 7009](https://datatracker.ietf.org/doc/html/rfc7009)

---

## BUG #1 — Naming inconsistency en tablas DB [LOW cosmético]

### Severidad
**LOW.** No causa bugs en runtime (EF Core mapea via attributes), pero confunde a desarrolladores que escriben queries crudas.

### Síntoma observado
```sql
SELECT tablename FROM pg_tables WHERE schemaname='public';
```

90% tablas: PascalCase quoted (`"Clientes"`, `"Pedidos"`, `"Cobros"`).
Excepciones snake_case lowercase:
- `activity_logs`
- `ai_credit_balances`
- `ai_credit_purchases`
- `ai_usage_logs`

### Root cause
Migrations de la feature AI fueron escritas con SQL crudo (`migrationBuilder.Sql(...)`) usando snake_case en lugar de PascalCase quoted. Memoria del usuario confirma: "feedback: SQL crudo en migrations usa snake_case columns".

### Propuesta de fix
**Opción A:** Renombrar tablas para consistencia (riesgo: requiere actualizar código C# que use names directos):

```csharp
// Migration nueva:
migrationBuilder.RenameTable("activity_logs", newName: "ActivityLogs");
// + actualizar entidad ActivityLog si tiene [Table("activity_logs")]
```

**Opción B:** Documentar la convención excepción para AI tables. NO renombrar.

**Recomendado:** Opción B — el costo de renombrar > beneficio cosmético. Solo agregar a `docs/architecture/DATABASE_NAMING_CONVENTIONS.md` la excepción.

### Referencias
- [EF Core - Table mapping conventions](https://learn.microsoft.com/en-us/ef/core/modeling/entity-types#table-name)

---

## BUG #2 — Pedidos huérfanos sin DetallePedidos [LOW data]

### Severidad
**LOW.** Solo seed data E2E, no producción.

### Síntoma observado
```sql
SELECT id, numero_pedido, total
FROM "Pedidos" p
WHERE p.tenant_id=1
  AND NOT EXISTS (SELECT 1 FROM "DetallePedidos" WHERE pedido_id=p.id);

-- Resultado:
-- PED-E2E-BATCH-1, PED-E2E-BATCH-2, PED-E2E-BATCH-3 (test seeds)
-- PED-EXPIRED-001, PED-INVOICED-001 (test seeds)
```

### Root cause
Seeds de E2E tests crean Pedidos sin detalles por simplicidad. No es bug productivo.

### Propuesta de fix
Limpiar seeds para crear detalles consistentes O documentar que estos seeds son intencionalmente shells:

```sql
-- En infra/database/schema/seed_e2e_pg.sql, agregar detalles minimos:
INSERT INTO "DetallePedidos" (pedido_id, producto_id, cantidad, precio_unitario, subtotal, impuesto, total, ...)
SELECT id, 5, 1, total, total*0.86, total*0.14, total, ...
FROM "Pedidos" WHERE numero_pedido LIKE 'PED-E2E-BATCH-%';
```

---

## BUG #5 — Cobros sin pedido_id [LOW design check]

### Severidad
**LOW.** Posible feature válida (cobros sueltos), pero requiere validación de negocio.

### Síntoma observado
```sql
SELECT id, monto, pedido_id, metodo_pago, tenant_id, creado_en
FROM "Cobros" WHERE pedido_id IS NULL;

-- Resultado: Cobro id=146 monto=17 sin pedido_id
```

### Verificación requerida del usuario
¿Es por diseño que existan cobros sin pedido (abonos sueltos, anticipos)? Si **NO**, agregar constraint:

```sql
ALTER TABLE "Cobros" ALTER COLUMN pedido_id SET NOT NULL;
```

Y verificar en `CobroRepository.CrearAsync` que valide la presencia.

Si **SÍ es por diseño**, documentar en CLAUDE.md el rule.

---

## Estado general — Lo que SÍ funciona ✅

Validado contra DB Postgres local (tenant=1, Jeyma):

| Check | Resultado |
|---|---|
| AuditableEntity `creado_en` populated | 0 filas NULL en Clientes/Pedidos/Cobros/Productos ✅ |
| Cross-tenant integrity (pedido vs cliente tenant) | 0 mismatches ✅ |
| Idempotency Pedido `mobile_record_id` | 0 duplicados ✅ |
| Idempotency en otras tablas mobile (Cobros/Visitas/Gastos/Clientes) | 0 duplicados ✅ |
| Backend health (1050/1051/1052) | 200 OK ✅ |
| xUnit suite Main API | 558/559 pass (1 skip preexistente) ✅ |
| DB counts seed tenant=1 | 10 zonas, 19 productos, 21 clientes, 14 pedidos, 25 usuarios ✅ |
| `subtotal + impuestos = total` consistencia en pedidos | TODOS los pedidos respetan la fórmula ✅ |

---

## Process improvement — agentes QA persistentes

Creados en `.claude/agents/`:
- `qa-backend.md` — xUnit + endpoint smoke + multi-tenant + security
- `qa-frontend.md` — Playwright suite + catálogos UI + console errors + responsive
- `qa-integration.md` — UI → API → DB end-to-end con SQL verifications

Activar via Claude Code: `Agent(subagent_type: "qa-backend")` para que ejecuten el `RELEASE_REGRESSION_CHECKLIST.md` automáticamente antes de cada PR.

---

**Última actualización:** 2026-06-05 — post audit code-quality
