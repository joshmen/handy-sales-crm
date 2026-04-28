# Plan: Eliminar booleanos `es_admin` / `es_super_admin` — única fuente de verdad = `rol`

> **Fecha**: 26 de abril de 2026
> **Scope**: backend C#, frontend web, DB schema. Mobile RN: 0 cambios (ya usa solo `role` del JWT).
> **Origen**: bug de hoy con xjoshmenx — `rol='SUPER_ADMIN'` pero `es_super_admin=false`. Ver memory/feedback_e2e_role_switch_clear_localstorage.md.

## Estrategia: refactor incremental compilable en cada paso

NO arrancamos dropeando columnas. Orden inverso al "feel natural":
1. Backfill data → 2. Cambiar lecturas → 3. Cambiar escrituras → 4. DTOs/JWT → 5. Frontend → 6. Drop columnas + props C# → 7. Cleanup tests/seeds.

Cada commit compila. Si truena algo en producción, rollback = revert.

## Fases (orden de ejecución)

### Fase 1 — Backfill DB
- [ ] 1.1 SQL idempotente: `UPDATE "Usuarios" SET rol = CASE WHEN es_super_admin THEN 'SUPER_ADMIN' WHEN es_admin THEN 'ADMIN' ELSE 'VENDEDOR' END WHERE rol IS NULL OR rol = '';`
- [ ] 1.2 Aplicar en local PG y verificar `SELECT COUNT(*) FROM "Usuarios" WHERE rol IS NULL;` = 0

### Fase 2 — Backend C#: cambiar LECTURAS
Patrón: `EsSuperAdmin` → `Rol == "SUPER_ADMIN"`. `EsAdmin` → `(Rol == "ADMIN" || Rol == "SUPER_ADMIN")` (los SA también pasaban como Admin en booleanos).

Archivos (orden suger.):
- [ ] 2.1 `apps/api/src/HandySuites.Api/Auth/AuthService.cs` (7 puntos)
- [ ] 2.2 `apps/api/src/HandySuites.Api/Endpoints/TenantEndpoints.cs` (3)
- [ ] 2.3 `apps/api/src/HandySuites.Api/Endpoints/DashboardEndpoints.cs` (3)
- [ ] 2.4 `apps/api/src/HandySuites.Api/Endpoints/SupervisorEndpoints.cs` (3)
- [ ] 2.5 `apps/api/src/HandySuites.Api/Endpoints/ImageUploadEndpoints.cs` (1)
- [ ] 2.6 `apps/api/src/HandySuites.Api/Automations/IAutomationHandler.cs` (2)
- [ ] 2.7 Resto: SubscriptionMonitor, ScheduledActionProcessor, MaintenanceMiddleware, NotificationEndpoints, StripeService, AnnouncementEndpoints, RutaSemanalAutoHandler — revisar y migrar
- [ ] 2.8 `libs/HandySuites.Application/Usuarios/Services/UsuarioService.cs` (filtros + DTO mapping)
- [ ] 2.9 `libs/HandySuites.Infrastructure/Repositories/Usuarios/UsuarioRepository.cs` (1)
- [ ] 2.10 `apps/mobile/HandySuites.Mobile.Api/Services/MobileAuthService.cs` (1)
- [ ] 2.11 `apps/mobile/HandySuites.Mobile.Api/Services/StockNotificationService.cs` (1)
- [ ] 2.12 `apps/mobile/HandySuites.Mobile.Api/Services/OrderNotificationHelper.cs` (2)
- [ ] 2.13 `apps/billing` — buscar `EsAdmin`/`EsSuperAdmin` (probablemente ninguno)

### Fase 3 — Backend: ESCRITURAS
- [ ] 3.1 `UsuarioService.cs:122` — bug crítico: agregar `RolExplicito` (hoy crea con rol=NULL)
- [ ] 3.2 Confirmar `AuthService.cs` y `TenantEndpoints.cs` setean RolExplicito (ya lo hacen)

### Fase 4 — DTOs + JWT
- [ ] 4.1 `UsuarioDto.cs`, `UsuarioProfileDto.cs`, `UsuarioSearchDto.cs` — eliminar `EsAdmin`/`EsSuperAdmin`. Solo `Rol` (string).
- [ ] 4.2 `JwtTokenGenerator.cs` — eliminar claims `es_admin` y `es_super_admin`. Solo `role`.
- [ ] 4.3 Ajustar mappings en services

### Fase 5 — Frontend web
- [ ] 5.1 `apps/web/src/services/api/profileService.ts` — quitar `esAdmin`, `esSuperAdmin` de `Profile` interface
- [ ] 5.2 `apps/web/src/services/api/users.ts` — quitar `esAdmin?`, `esSuperAdmin?` de `User`
- [ ] 5.3 `apps/web/src/contexts/ProfileContext.tsx` — eliminar derivación
- [ ] 5.4 `apps/web/src/hooks/useProfile.ts` — igual
- [ ] 5.5 `apps/web/src/app/(dashboard)/profile/page.tsx` — usar `profile.role === 'SUPER_ADMIN'` etc.
- [ ] 5.6 `apps/web/src/app/(dashboard)/team/components/MiembrosTab.tsx` — leer `apiUser.rol`, escribir `rol` en lugar de `esAdmin`

### Fase 6 — Drop columnas + props
- [ ] 6.1 `Usuario.cs`: eliminar `EsAdmin` y `EsSuperAdmin`. `Rol` ya no es computed.
- [ ] 6.2 Migración EF Core: `DropColumn("es_admin")`, `DropColumn("es_super_admin")`, `AlterColumn("rol")` NOT NULL
- [ ] 6.3 Aplicar migración (local primero, dev DB)

### Fase 7 — Seeds + tests
- [ ] 7.1 `infra/database/schema/seed_local_pg.sql` — eliminar columnas booleanas
- [ ] 7.2 `seed_production.sql` — igual
- [ ] 7.3 `seed_e2e_pg.sql` — igual (si existe)
- [ ] 7.4 `HandySalesTestSeeder.cs` — todos los `EsAdmin = …` por `RolExplicito = …`
- [ ] 7.5 `MobileAuthEndpointsTests.cs` — igual
- [ ] 7.6 Otros tests xUnit — buscar `EsAdmin`, `EsSuperAdmin`

### Fase 8 — Verificación
- [ ] 8.1 `dotnet build` clean
- [ ] 8.2 `dotnet test` API (391) + Mobile (38)
- [ ] 8.3 `npm run type-check` web
- [ ] 8.4 Rebuild Docker `api_main api_billing api_mobile`
- [ ] 8.5 Health checks 1050/1051/1052
- [ ] 8.6 curl logins: SA + Admin + Vendedor → 200 con `role` correcto

### Fase 9 — Playwright web
- [ ] 9.1 `cupones.spec` (SA) → 3/3
- [ ] 9.2 `impersonation-sidebar.spec` (SA) → 3/3
- [ ] 9.3 `auth.spec` + `security-announcements.spec`
- [ ] 9.4 `profile-security.spec`
- [ ] 9.5 `rbac.spec`
- [ ] 9.6 Smoke run completo, comparar vs baseline 92 passed

### Fase 10 — Mobile validation
- [ ] 10.1 Login Maestro flow admin + vendedor
- [ ] 10.2 Verificar JWT decode no rompe (mobile no usa claims `es_admin`)
- [ ] 10.3 Verificar push notifications a admins/supervisores siguen llegando

## Plan de commits

1. `chore(db): backfill rol column before dropping boolean flags` — Fase 1
2. `refactor(api): use Usuario.Rol string at all read sites` — Fase 2
3. `refactor(api): always set RolExplicito on user creation` — Fase 3
4. `refactor(api): drop EsAdmin/EsSuperAdmin from DTOs + JWT claims` — Fase 4
5. `refactor(web): use role string instead of esAdmin/esSuperAdmin` — Fase 5
6. `refactor(domain): drop EsAdmin/EsSuperAdmin properties + EF migration` — Fase 6
7. `chore(seeds+tests): use rol column only` — Fase 7

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Tokens emitidos antes del cambio tienen claims viejos | NextAuth ya lee solo `role`. Mobile tampoco lee. Sin impacto. |
| DB constraint NOT NULL falla por filas con `rol=NULL` | Backfill obligatorio (Fase 1) ANTES de la migración drop |
| EF Core `EnsureCreated()` no aplica migrations | Confirmé en `Program.cs` — usa `EnsureCreated`. La migración NO auto-aplica. Aplicar SQL manual local + workflow GitHub Actions para staging/prod |
| Frontend session shape cambia → caches viejos rompen | NextAuth re-issue al próximo login. Si truena, limpiar cookies. |

## Tiempo estimado real

~7-8h. NO en una sola pasada — fragmentado en 7 commits atómicos compilables.
