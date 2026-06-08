# Deeper Audit — 2026-06-07

## 1. Executive Summary

- **Version++ follow-ups: 5/5 applied and verified** — all double-bump bugs across `apps/` and `libs/` removed (Phase 1 file edits applied; Phase 2 build clean, 1111 tests pass / 0 fail / 15 skip — exact baseline parity).
- **Deeper audit: 65 raw findings → 26 confirmed real** (≥2/3 skeptic vote). Severity: **1 critical, 7 high, 14 medium, 4 low**.
- **Top systemic concerns**: (a) data-integrity holes in sync + multi-step writes (lost-update on `RutasCarga`, unwrapped multi-write closures, per-entity swallowed exceptions), (b) JWT secret has no length/non-empty guard in the Main API while the base `appsettings.json` ships an empty string, (c) fire-and-forget critical notifications with no persistence/retry.

---

## 2. Version++ Follow-Ups Applied

The `SaveChangesAsync` override at [HandySalesDbContext.cs#L121](libs/HandySuites.Infrastructure/Persistence/HandySalesDbContext.cs#L121) is the **single canonical author** of `Version` on `Modified` `AuditableEntity` rows. Every manual `entity.Version++` before `SaveChangesAsync` on a tracked entity was a +2 double-bump.

| # | File | Line | Endpoint / Method | Status |
|---|------|------|--------------------|--------|
| 1 | [RutaVendedorRepository.cs](libs/HandySuites.Infrastructure/Repositories/Rutas/RutaVendedorRepository.cs#L433) | 433 | `VincularGastosHuerfanosAsync` foreach | Removed |
| 2 | [DevolucionesEndpoints.cs](apps/api/src/HandySuites.Api/Endpoints/DevolucionesEndpoints.cs#L143) | 143 | `AnularDevolucion` | Removed |
| 3 | [GastosEndpoints.cs](apps/api/src/HandySuites.Api/Endpoints/GastosEndpoints.cs#L118) | 118 | `InvalidarGasto` | Removed |
| 4 | [MobileAttachmentEndpoints.cs](apps/mobile/HandySuites.Mobile.Api/Endpoints/MobileAttachmentEndpoints.cs#L139) | 139 | gasto comprobante upload | Removed |
| 5 | [MobileAttachmentEndpoints.cs](apps/mobile/HandySuites.Mobile.Api/Endpoints/MobileAttachmentEndpoints.cs#L151) | 151 | devolucion foto evidencia upload | Removed |

**Build/test verification**: Infrastructure + Api built clean (0 errors, only pre-existing warnings). API test suite: **1111 passed / 0 failed / 15 skipped (1m25s)** — exact match to post-fix-#1 baseline. Zero regressions.

---

## 3. Deeper Audit Findings — by Severity

### CRITICAL

#### C-1. Empty JWT Secret in `appsettings.json` with no startup guard (Main API)
- **File**: [appsettings.json#L20](apps/api/src/HandySuites.Api/appsettings.json#L20) + [JwtExtensions.cs#L13](apps/api/src/HandySuites.Api/Configuration/JwtExtensions.cs#L13)
- **Vote**: 2/3 confirmed
- **Description**: Base `appsettings.json` ships `"Secret": ""`. `JwtExtensions.cs` (Main API) creates `new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret))` without guard. Mobile/Billing APIs validate this — Main API does not.
- **Evidence**: Skeptic refuting on grounds env vars override is correct **only when deployed**; misconfiguration silently produces 0-byte keys until first token attempt. Confirmers note the Mobile API has the validation that Main API lacks (asymmetry = bug).
- **Suggested fix**: Add `if (string.IsNullOrWhiteSpace(jwtSettings.Secret) || jwtSettings.Secret.Length < 32) throw new InvalidOperationException(...)` at startup in `JwtExtensions.AddJwtAuthentication`. Mirror the Mobile API pattern.

---

### HIGH

#### H-1. `RutasCarga` counter increments lost on concurrent sync (SyncRepository)
- **File**: [SyncRepository.cs#L596-L611](libs/HandySuites.Infrastructure/Repositories/Sync/SyncRepository.cs#L596)
- **Category**: reliability / data-integrity
- **Vote**: 2/3 (one skeptic incorrectly cited optimistic concurrency as sufficient; majority noted the modifications are tracked but the second concurrent write throws `DbUpdateConcurrencyException` causing full rollback **and lost sync progress** — not silent loss but a hard failure pattern for legitimate concurrent deliveries).
- **Description**: `UpsertPedidoAsync` increments `CantidadVendida` / `CantidadEntregada` in memory after a `FirstOrDefaultAsync` without row-level lock or `ExecuteUpdateAsync`. Parallel deliveries from different vendors of the same product on the same ruta race.
- **Suggested fix**: Replace in-memory `+=` with `ExecuteUpdateAsync` for atomic SQL `UPDATE RutasCarga SET CantidadEntregada = CantidadEntregada + @n`. Apply across all 4+ counter paths (`PedidoRepository.IncrementarRutaCargaPorPedidoEntregadoAsync`, `RutaVendedorRepository` methods).

#### H-2. Fire-and-forget `Task.Run` notifications in route endpoints
- **File**: [RutaVendedorEndpoints.cs#L23-L177](apps/api/src/HandySuites.Api/Endpoints/RutaVendedorEndpoints.cs#L23)
- **Category**: reliability
- **Vote**: 3/3
- **Description**: 4 helper methods (`NotifyMobileRouteCancelled`, `NotifyMobileRouteAssignment`, `EmitRouteAssignedSignalR`, `NotifyMobileRouteSentToLoad`) use `_ = Task.Run(...)` with try-catch warning only. No retry, no persistent queue. Vendors in the field can be operating with stale routes on silent notification failure.
- **Suggested fix**: Introduce a persistent outbox (Hangfire, or a `pending_notifications` table polled by a `BackgroundService`). For cancellations specifically, retry with exponential backoff and surface failures via metrics.

#### H-3. `CerrarRutaAsync` multi-step writes outside transaction
- **File**: [RutaVendedorService.cs#L1082-L1103](libs/HandySuites.Application/Rutas/Services/RutaVendedorService.cs#L1082)
- **Category**: data-integrity
- **Vote**: 3/3
- **Description**: Loops `_repo.ActualizarRetornoAsync(...)` (each calls `SaveChangesAsync`) then `_repo.CerrarRutaAsync` (separate `SaveChangesAsync`). Partial retornos persist on mid-loop failure with the route still open.
- **Suggested fix**: Wrap with `ITransactionManager.ExecuteInTransactionAsync` (already used by `SyncService`).

#### H-4. SQL injection pattern via interpolated `NOT IN` clause (Billing — OrderReaderService)
- **File**: [OrderReaderService.cs#L69-L87](apps/billing/HandySuites.Billing.Api/Services/OrderReaderService.cs#L69)
- **Category**: security
- **Vote**: 2/3 (one skeptic correctly notes `excludedPedidoIds` is `List<long>` so practically not exploitable; majority votes this as a real defensive-coding violation and inconsistent with `NpgsqlCommand` parameters used for `@tenantId`, `@fechaInicio`, `@fechaFin` on the same query).
- **Description**: `$"AND p.id NOT IN ({string.Join(",", excludedPedidoIds)})"` is interpolated directly into the raw SQL. Type-safety mitigates today, but the pattern blocks audit and breaks if the list source ever changes.
- **Suggested fix**: `WHERE p.id <> ALL(@excludedIds)` with `cmd.Parameters.AddWithValue("excludedIds", excludedPedidoIds.ToArray())`.

#### H-5. JWT issuer/audience validation disabled in Development
- **File**: [JwtExtensions.cs#L26-L37](apps/api/src/HandySuites.Api/Configuration/JwtExtensions.cs#L26)
- **Category**: security
- **Vote**: 2/3 (one skeptic justifies as documented dev-only pattern; majority notes signing-key + lifetime are still enforced but issuer/audience bypass widens the attack surface if a dev token ever leaks or env conflates).
- **Suggested fix**: Always enforce `ValidateIssuer = true` / `ValidateAudience = true`; instead, in dev set the lists to include the local test issuer. Tests already use `FakeJwtAuthHandler` so they aren't affected.

#### H-6. `Console.WriteLine` for environment log in Mobile API DI bootstrap
- **File**: [ServiceRegistrationExtensions.cs#L76](apps/mobile/HandySuites.Mobile.Api/Configuration/ServiceRegistrationExtensions.cs#L76)
- **Category**: observability
- **Vote**: 2/3
- **Description**: Bypasses Serilog → not in Seq / CloudWatch / App Insights.
- **Suggested fix**: Use `Serilog.Log.Information("[Mobile API] Entorno actual: {Environment}", environment)` after Serilog is bootstrapped, or move to a `IHostedService`.

#### H-7. String interpolation inside `_logger.LogInformation` breaks Seq structured search (Billing — CatalogosController)
- **File**: [CatalogosController.cs#L182](apps/billing/HandySuites.Billing.Api/Controllers/CatalogosController.cs#L182), [#L217](apps/billing/HandySuites.Billing.Api/Controllers/CatalogosController.cs#L217)
- **Category**: observability
- **Vote**: 3/3
- **Description**: `$"... tenant {tenantId}"` instead of `"... tenant {TenantId}", tenantId`. Inconsistent with same file (lines 269, 305, 331…).
- **Suggested fix**: Convert both lines to structured placeholders. Add a Roslyn analyzer rule (e.g. `Serilog.Analyzers`) to catch project-wide.

---

### MEDIUM

#### M-1. SyncService per-entity try-catch suppresses exceptions inside outer transaction
- **File**: [SyncService.cs#L72-L420](libs/HandySuites.Application/Sync/Services/SyncService.cs#L72)
- **Category**: data-integrity
- **Vote**: 3/3
- **Description**: Outer `ExecuteInTransactionAsync` cannot roll back because exceptions are caught per entity, logged to `response.Errors`, and processing continues. `SaveChangesAsync` commits successful entities + leaves failed ones reported as "errors" → partial commit despite intended atomicity.
- **Suggested fix**: After collecting per-entity error context, **re-throw** to abort the outer transaction. Or switch to a per-entity savepoint pattern if partial success is desired (then document it explicitly).

#### M-2. Multi-step writes in `RutaVendedor.EnviarACargaAsync` (batch pedidos) no explicit transaction (lens callout, not separately scored — see H-3 / M-1 pattern)
- Same fix as H-3.

#### M-3. Cloudinary folder creation swallows exceptions during tenant registration
- **File**: [AuthService.cs#L327-L344](apps/api/src/HandySuites.Api/Auth/AuthService.cs#L327)
- **Category**: reliability
- **Vote**: 2/3 (one skeptic notes upload-time lazy creation in `ImageUploadEndpoints.cs:172-176` self-heals; majority notes self-heal is implicit/delayed and registration completes silently with `tenant.CloudinaryFolder = null`).
- **Suggested fix**: Add retry with exponential backoff; if still failing, log at Error level and enqueue a `pending_cloudinary_folder` repair task so admins can monitor.

#### M-4. Unquoted table name in `AnalyticsEndpoints` SQL builder
- **File**: [AnalyticsEndpoints.cs#L190](apps/api/src/HandySuites.Api/Endpoints/AnalyticsEndpoints.cs#L190)
- **Category**: security (defensive)
- **Vote**: 3/3
- **Description**: `FROM {source.Table}` — whitelist mitigates injection, but inconsistent with the columns (which are quoted) and the `tenantId` is interpolated, not parameterized.
- **Suggested fix**: Quote: `FROM \"{source.Table}\"`. Parameterize tenantId: `WHERE tenant_id = @tenantId`.

#### M-5. `ExecuteSqlRawAsync` with positional placeholders in `SubscriptionEnforcementService`
- **File**: [SubscriptionEnforcementService.cs#L41-L43, #L199-L200, #L261-L262](libs/HandySuites.Infrastructure/Services/SubscriptionEnforcementService.cs#L41)
- **Category**: bad-practice
- **Vote**: 2/3
- **Description**: Same file uses `ExecuteSqlInterpolatedAsync` at L269 — inconsistent.
- **Suggested fix**: Migrate all to `ExecuteSqlInterpolatedAsync` with `FormattableString`.

#### M-6. Missing composite index on `Cobro(TenantId, UsuarioId, ActualizadoEn/CreadoEn)` for incremental sync
- **File**: [HandySalesDbContext.cs#L791-L801](libs/HandySuites.Infrastructure/Persistence/HandySalesDbContext.cs#L791) and the query at [SyncRepository.cs#L874](libs/HandySuites.Infrastructure/Repositories/Sync/SyncRepository.cs#L874)
- **Category**: performance
- **Vote**: 2/3
- **Suggested fix**: `entity.HasIndex(c => new { c.TenantId, c.UsuarioId, c.ActualizadoEn });` (and same for `CreadoEn`). Same pattern likely needed for Pedido and Gasto sync.

#### M-7. `ElementAt(i)` inside for-loop on EF navigation (`entity.Detalles`)
- **File**: [SyncService.cs#L366-L369](libs/HandySuites.Application/Sync/Services/SyncService.cs#L366)
- **Category**: performance
- **Vote**: 3/3
- **Description**: O(n²); line 368 already uses indexed access on `dto.Detalles[i]`. Inconsistent.
- **Suggested fix**: `var detallesList = entity.Detalles.ToList();` once, then `detallesList[i]`.

#### M-8. JWT secret length not validated (Main API)
- **File**: [JwtTokenGenerator.cs#L37, #L66, #L104](libs/HandySuites.Shared/Security/JwtTokenGenerator.cs#L37)
- **Category**: security
- **Vote**: 2/3 — related to C-1.
- **Suggested fix**: Validate `>= 32` chars at startup. See C-1 fix.

#### M-9. `CobroService.CrearAsync` has no logging (high-value financial op)
- **File**: [CobroService.cs#L43-L88](libs/HandySuites.Application/Cobranza/Services/CobroService.cs#L43)
- **Category**: observability
- **Vote**: 2/3
- **Suggested fix**: Inject `ILogger<CobroService>`; log entry, success (with `CobroId`), and each validation failure with `ClienteId`/`PedidoId`/`UsuarioId`.

#### M-10. Impersonation: no correlation ID stored on `ImpersonationSession`
- **File**: [ImpersonationEndpoints.cs#L23-L65](apps/api/src/HandySuites.Api/Endpoints/ImpersonationEndpoints.cs#L23)
- **Category**: observability
- **Vote**: 2/3 (split — Serilog `Enrich.FromLogContext()` provides request-scoped correlation, but the entity has no field for downstream/async correlation).
- **Suggested fix**: Add `CorrelationId` column to `ImpersonationSession`, set from `HttpContext.TraceIdentifier`.

#### M-11. CFDI timbrado entry has no Information-level log
- **File**: [FinkokPacService.cs#L30-L51](apps/billing/HandySuites.Billing.Api/Services/FinkokPacService.cs#L30)
- **Category**: observability
- **Vote**: 2/3 — DEBUG log exists at L166 but invisible in prod Info-level config.
- **Suggested fix**: Add `_logger.LogInformation("Starting CFDI timbrado. ConfigId: {ConfigId}, Ambiente: {Ambiente}", config.Id, config.PacAmbiente)` at L31.

#### M-12. `InventarioService.CrearInventarioAsync` check-then-create without lock
- **File**: [InventarioService.cs#L38-L43](libs/HandySuites.Application/Inventario/Services/InventarioService.cs#L38)
- **Category**: reliability
- **Vote**: 3/3 (severity low; risk is 500 instead of 409 on race).
- **Suggested fix**: Wrap call in `AcquireProductoLockAsync` (already exists in repository), or use `INSERT … ON CONFLICT DO NOTHING` + check.

#### M-13. CommandPalette search: cancellation flag set but HTTP requests not aborted
- **File**: [CommandPalette.tsx#L61-L95](apps/web/src/components/layout/CommandPalette.tsx#L61)
- **Category**: reliability
- **Vote**: 2/3 — flag prevents setState warnings but wastes network/server work.
- **Suggested fix**: Plumb `AbortSignal` through `clientService.getClients`, `productService.getProducts`, `orderService.getOrders`.

#### M-14. Multi-device conflict resolution has no drill-down UI / no `sync_conflicts` table
- **File**: [syncEngine.ts#L244-L274](apps/mobile-app/src/sync/syncEngine.ts#L244)
- **Category**: observability
- **Vote**: 2/3 (one skeptic correctly notes the resolver is intentional post-incident hardening; majority votes the **absence of drill-down + history** is the gap).
- **Suggested fix**: New WatermelonDB `sync_conflicts` table + a "Conflictos recientes" screen.

#### M-15. Timezone tests use raw `DateTime.UtcNow.Date` (midnight-boundary flake)
- **File**: [ActivityTrackingRepositoryTests.cs#L192, #L290, #L340](apps/api/tests/HandySuites.Tests/Infrastructure/ActivityTracking/ActivityTrackingRepositoryTests.cs#L192)
- **Category**: test-quality
- **Vote**: 2/3 (skeptic correctly notes L192/L290 pass `today` value; majority confirms L340's `GetActivityChartDataAsync` re-queries `DateTime.UtcNow` internally → real flake at midnight UTC).
- **Suggested fix**: Mock `ITenantTimeZoneService` to return a frozen `today` (the test already injects a stub — fix the stub at [`FixedUtcTenantTimeZoneService` L27-L45]).

---

### LOW

#### L-1. Mobile sync engine: phases 4–6 (`crashReporter.flushPendingReports`, GPS ping flush, notification history) use empty catch
- **File**: [syncEngine.ts#L313-L336](apps/mobile-app/src/sync/syncEngine.ts#L313)
- **Vote**: 2/3 — split; majority notes inconsistent vs. phases 0/3/3.5 which `__DEV__`-log.
- **Suggested fix**: Add structured `__DEV__` logging for parity, and report a counter to `crashReporter` after N consecutive failures.

#### L-2. Advisory-lock SQL uses `ExecuteSqlRawAsync` for consistency, not security
- **File**: [SubscriptionEnforcementService.cs#L41-L43](libs/HandySuites.Infrastructure/Services/SubscriptionEnforcementService.cs#L41), [CobroRepository.cs#L117-L119](libs/HandySuites.Infrastructure/Repositories/Cobranza/CobroRepository.cs#L117), [InventarioRepository.cs#L181-L183](libs/HandySuites.Infrastructure/Repositories/Inventario/InventarioRepository.cs#L181)
- **Vote**: 3/3 — **not a vulnerability**; finding is "safe today, migrate for consistency."
- **Suggested fix**: Migrate to `ExecuteSqlInterpolatedAsync` to match the rest of the codebase.

#### L-3. Device session push notification logs failure at Debug after fire-and-forget
- **File**: [DeviceSessionEndpoints.cs#L145-L152](apps/api/src/HandySuites.Api/Endpoints/DeviceSessionEndpoints.cs#L145)
- **Vote**: 2/3 — split; intentional alert-fatigue avoidance is documented.
- **Suggested fix**: Keep Debug, but emit a metric counter so dashboards see notification-delivery-failure rate.

#### L-4. Skipped test asserts `BeCloseTo(DateTime.UtcNow, …)` — deferred debt
- **File**: [SyncServiceUnitTests.cs#L96-L104](apps/api/tests/HandySuites.Tests/Application/Sync/SyncServiceUnitTests.cs#L96)
- **Vote**: 2/3 — finding is correct; severity already low.
- **Suggested fix**: Capture time before Act, or inject `ISystemClock`, when test is un-skipped.

---

## 4. Lens-by-Lens Summary

| Lens | Raw | Confirmed | Most-critical finding |
|------|-----|-----------|------------------------|
| Concurrency & sync race conditions | ~12 | 2 | H-1 RutasCarga lost-update |
| Multi-step write transaction safety | ~6 | 3 | H-3 CerrarRutaAsync |
| Fire-and-forget / swallowed exceptions | ~10 | 5 | H-2 RutaVendedorEndpoints notifications |
| SQL injection / unsafe SQL construction | ~5 | 4 | H-4 OrderReaderService NOT IN |
| JWT / secret management | ~6 | 4 | **C-1 empty JWT secret** |
| Observability (logs, correlation, levels) | ~7 | 6 | H-6 / H-7 Mobile & Billing |
| Performance (N+1, missing index, ElementAt) | ~5 | 3 | M-7 ElementAt in loop |
| Mobile offline-first sync gaps | ~6 | 2 | M-14 conflict drill-down |
| Web React hooks / cleanup | ~4 | 1 | M-13 CommandPalette |
| Test quality | ~4 | 2 | M-15 ActivityTracking date flake |
| **Totals** | **~65** | **26** | |

---

## 5. Recommended Next Actions

**Immediate (this branch, before any push):**
1. **C-1**: Add JWT secret validation in [`JwtExtensions.cs`](apps/api/src/HandySuites.Api/Configuration/JwtExtensions.cs) (Main API) to match Mobile API. Non-empty + min 32 chars. Throw at startup. 15-min fix; blocks misdeployments forever.
2. **H-1**: Convert `RutasCarga` counter `+=` writes in `SyncRepository.UpsertPedidoAsync` (and the 3 other paths) to `ExecuteUpdateAsync(x => x.SetProperty(c => c.CantidadEntregada, c => c.CantidadEntregada + n))`. Add xUnit concurrency test.
3. **H-3 / M-1**: Wrap `RutaVendedorService.CerrarRutaAsync` in `ITransactionManager.ExecuteInTransactionAsync`. Re-throw inside `SyncService` per-entity catches OR document partial-commit semantics explicitly.
4. **H-4 / M-4**: Parameterize `OrderReaderService` `NOT IN` and `AnalyticsEndpoints` `tenant_id`. Quote table identifier.

**Next sprint:**
5. **H-2**: Introduce a persistent outbox + `BackgroundService` for critical notifications (route cancellations first).
6. **H-7 / M-9 / M-11**: Project-wide Serilog hygiene pass — add `Serilog.Analyzers`, convert string-interpolated log calls, add entry logs to `CobroService.CrearAsync` and `FinkokPacService.TimbrarAsync`.
7. **M-6**: Add `(TenantId, UsuarioId, ActualizadoEn)` and `(…, CreadoEn)` composite indexes to `Cobro`, `Pedido`, `Gasto`. Generate EF migration.
8. **M-15**: Fix `FixedUtcTenantTimeZoneService` stub to actually freeze time.

**Backlog:**
9. **M-13**: AbortController plumbing through web service layer.
10. **M-14**: `sync_conflicts` table + screen in mobile app.
11. **L-2**: Bulk migration to `ExecuteSqlInterpolatedAsync` for consistency.

---

*Verification baseline preserved: 1111 passed / 0 failed / 15 skipped on `dotnet test apps/api/tests/HandySuites.Tests/`. Build clean across `libs/HandySuites.Infrastructure` and `apps/api/src/HandySuites.Api`.*
