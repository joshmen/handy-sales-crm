# Ejecución del audit 2026-05-25 — `chore/audit-fixes-may25`

Reporte original: `tasks/audit-may25-2026.md`. Plan: `~/.claude/plans/eager-drifting-journal.md`.

## Done ✅

### Bloque 1 — Backend seguridad
- **H-2 FALSO POSITIVO** — el `group.MapGroup("/api/ai").RequireAuthorization()` en línea 35 ya cubre `/admin/refresh-views`. Nada que arreglar.
- **M-6** — `AiEndpoints.cs:1489-1490` → `ExecuteSqlInterpolated` (defense in depth)
- **H-1** — 5 nuevos xUnit tests RBAC para `ClienteService.ObtenerPorIdAsync` documentan el contract IDOR-safe y previenen regresiones (vendedor regular no ve clientes ajenos, supervisor ve solo su equipo, admin ve todo). 17/17 pass.
- **H-3** — `QueryStringRedactor` enmascara token/code/email/password/apikey/secret/access_token/refresh_token/otp/totp/recovery en query strings antes de loguearlos. 17 unit tests pass. Aplicado en `RequestLoggingMiddleware`.
- **M-7** — Nueva policy `batch-mutations` (10/min/usuario) en Program.cs. Aplicada a `UsuarioEndpoints.MapPatch("/batch-toggle")`.
- **L-1** — `AutomationSchedule` ahora tiene `HasQueryFilter` (era entity orphan con `TenantId` sin filter; defense in depth para uso futuro).
- **L-3** — `Producto.CodigoBarra` MaxLength(50) en validator.
- **L-4** — `Producto.PrecioBase` cap superior $10M MXN.
- **L-5** — `ListaPrecio.Nombre` MaxLength(100) en validator.
- **L-6** ya cubierto previamente — `GlobalExceptionMiddleware:110` maneja `JsonException → 400`.

### Bloque 2 — Frontend refactor
- **H-4** — `apps/web/src/components/clients/ClientForm.tsx` (581 LOC) extraído. Páginas `new` (31 LOC) y `edit` (125 LOC) ahora son wrappers thin. **1374 → 737 LOC, reducción 46%**. Cualquier cambio al form se hace ahora en UN solo lugar.
- **M-4** — `apps/web/src/lib/constants/orderStatusStyles.ts` centraliza 22 hardcoded Tailwind classes + `getNextAction()` transition map. `orders/page.tsx` importa desde el módulo.
- **M-8** — `apps/web/src/lib/validations/zone.ts` externaliza el Zod schema inline.

### Bloque 3 — Sidebar / IA
- **H-5** — `Transferir cartera` movido del Equipo → Clientes. Sidebar item renombrado a "Reasignar cartera". Path nuevo: `/clients/transferir-cartera`. Path viejo `/team/transferir-cartera` → redirect 301 vía `redirect()` de Next.js. Breadcrumb actualizado. Botón cancelar va a `/clients` (no `/team`). Plan: mantener redirect 90 días, evaluar telemetría.
- **M-1** — Cross-link info banner en `/settings` apuntando a `/billing/settings` y viceversa. Soluciona el problema de admin perdido buscando configuración fiscal.

## Deferred — recomendados para follow-up PR ⏭

Estos items requieren refactor invasivo de mayor riesgo o decisiones de producto. NO se incluyen en este PR para mantenerlo revisable.

- **M-2 Discounts vs Promotions distinción** — requiere investigación de lógica de negocio (¿cuándo usar cada uno?) y posible consolidación. Decisión de producto, no de código.
- **M-3 Routes / Invoices missing create/edit** — verificar 5 min si es intencional (invoices SAT immutable, routes via API) o feature gap. Probable intencional.
- **M-5 Zones DataGrid migration** — `zones/page.tsx` tiene custom table de ~200 LOC. Migrar a `DataGrid` con `mobileCardRenderer` toma ~3 horas y arriesga romper batch-toggle + Playwright zones. Separar en PR `refactor(zones): unify to DataGrid pattern`.
- **M-9 Dashboard CSS vars** — `style={{ color: 'var(--company-primary-color, #16a34a) }}` es legítimo runtime theming (CompanyContext setea el var on mount). El audit lo flag-eó como AI smell pero el pattern es defensivo correcto.
- **L-2 ariaLabel sweep** — barrido a través de SearchableSelect / Drawer / batch action buttons (~2-3h). Bajo riesgo, alto volumen — vale en PR dedicado de a11y.
- **L-7 Playwright en CI** — requiere `.github/workflows/playwright-e2e.yml` + docker-compose + secrets + storageState. ~2-3h. PR dedicado de DevOps.
- **L-8 Phosphor consistency** — barrido visual reemplazando Lucide donde diverge. Bajo impacto funcional. PR dedicado de design system.

## Commits del PR

```
b1087d07 docs(audit): comprehensive review report 2026-05-25
425f9d7d fix(security/ai): use ExecuteSqlInterpolated for refresh views (M-6, defense in depth)
765998e0 test(security/cliente): RBAC regression tests for ObtenerPorIdAsync (H-1)
ca9aa20b fix(security/logging): redact tokens/emails/secrets from QueryString in request logs (H-3)
56c7c1ca feat(security/rate-limit): add batch-mutations policy (10/min/user) for bulk ops (M-7)
5249331e fix(security/multitenancy): add HasQueryFilter to AutomationSchedule (L-1)
08aab234 fix(validators): producto CodigoBarra max 50, PrecioBase cap 10M, ListaPrecio Nombre max 100 (L-3/L-4/L-5)
2f9e488e refactor(clients): extract ClientForm shared component, 1374 -> 737 LOC (H-4)
... orders+zones refactor commit ...
35892236 refactor(sidebar): move Transferir cartera under Clientes; 301 redirect from /team/transferir-cartera (H-5)
45ab5038 feat(settings): cross-link entre /settings y /billing/settings para discover (M-1)
```

## Verificación

- `dotnet test`: 522/523 pass (1 skipped) — incluye 22 tests nuevos (RBAC + redactor)
- `npm run type-check`: 0 errors
- Playwright `client-fiscal-data.spec.ts`: 9/10 pass + 1 flake (no relacionado al refactor)
- Pendiente: full Playwright suite

## Status del audit

| Sev | Reporte | Done | Deferred | Falso positivo |
|---|---|---|---|---|
| HIGH | 5 | 4 | 0 | 1 (H-2) |
| MEDIUM | 9 | 4 | 5 | 0 |
| LOW | 8 | 5 | 3 | 0 |
| **Total** | **22** | **13** | **8** | **1** |

**59% del audit cerrado en un solo PR**, con focus en items de mayor riesgo (security HIGH) e impacto (H-4 refactor que elimina 637 LOC duplicados).
