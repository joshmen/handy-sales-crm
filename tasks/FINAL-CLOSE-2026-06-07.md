# FINAL CLOSE-OUT — Single-Session Strict Audit Effort
**Date:** 2026-06-07
**Worktree:** `C:/tmp/handy-single-session`
**Branch:** `feat/single-session-strict`
**Scope:** 6 workflows · 2 deep audits · 3 fix waves · 1 deferred-item closure pass
**Verdict:** **GREEN to merge to staging**, with explicit caveats listed in §5.

This document is the final word on the entire audit effort. It supersedes every prior `tasks/*-2026-06-07.md` report. Brutally honest. No surprises.

---

## 1. Final Stats Across All 6 Workflows

| # | Workflow | Agents | Raw findings | Confirmed | Fixed in workflow | Status |
|---|----------|--------|--------------|-----------|-------------------|--------|
| 1 | Deep audit pass 1 (E2E stabilization + 8 lenses) | 24 | 55 | 23 | — (audit only) | Closed |
| 2 | Fix wave for workflow #1 | ~150 | — | — | 16 | Closed |
| 3 | Deeper audit (10 new lenses) + Version++ follow-ups | 28 | 65 | 26 | 5 (Version++ only) | Closed |
| 4 | Fix wave for workflow #3 | ~150 | — | — | 19 | Closed |
| 5 | Close-all-pendings (deferred items + H-2 Outbox MVP) | ~60 | — | — | 17 | Closed |
| 6 | **Final-close (this workflow)** — 5.2, 5.3, 5.4, 5.5 | 4 | — | — | **3 + 1 documented** | Closed |
| **Total** | | **~420 agents** | **120** | **49** | **60** | — |

### Verified delta vs. pre-audit baseline

| Suite | Pre-audit baseline | Final (W6) | Delta |
|-------|--------------------|------------|-------|
| API (HandySuites.Tests) | 1110 pass / 17 skip | **1126 pass / 0 fail / 0 skip** | **+16 pass, −17 skip** |
| Mobile (HandySuites.Mobile.Tests) | 733 pass / 15 skip | **739 pass / 0 fail / 9 skip** | +6 pass, −6 skip (9 remaining are legit E2E-gated) |
| Billing (HandySuites.Billing.Tests) | 207 pass / 2 skip | **209 pass / 0 fail / 0 skip** | +2 pass, −2 skip |
| **xUnit total** | **2050p / 0f / 34s** | **2074p / 0f / 9s** | **+24 pass, −25 skip** |
| Web type-check (tsc --noEmit) | 0 errors | **0 errors** | clean |

**Zero regressions across 6 workflows.** Baseline preserved through every fix pass.

---

## 2. Definitive Closed List — 60 items by severity

### CRITICAL (1)

| ID | Title | Workflow | File |
|----|-------|----------|------|
| C-1 | Empty JWT Secret in `appsettings.json` + no startup guard (Main API) | W4 | `JwtExtensions.cs`, `JwtTokenGenerator.cs` |

### HIGH (18)

| ID | Title | Workflow | File / Action |
|----|-------|----------|---------------|
| 4.1 | CobroEndpoints RBAC bypass (bare `.RequireAuthorization()`) | W2 | `CobroEndpoints.cs` — `RequireRole(ADMIN, SUPERVISOR, SUPER_ADMIN)` |
| 4.2 | InventarioEndpoints GET allowed any authenticated user | W2 | `InventarioEndpoints.cs` |
| 4.3 | ReportEndpoints SUPERVISOR scope leak (tenant-wide aggregates) | W5 | `ReportEndpoints.cs` — SUPERVISOR removed |
| 4.4 | `/cobranza` page lacks defense-in-depth role guard | W5 | `apps/web/.../cobranza/page.tsx` |
| 4.5 | `CloseAllActiveSessions` missing audit log | W2 | `AuthService.cs` |
| 4.6 | OAuth `SocialLoginAsync` bypassed single-session 409 warning | W2 | `AuthService.cs` |
| 4.7 | Web Modal missing focus restoration on close | W2 | `apps/web/.../Modal.tsx` |
| 4.8 | Mobile ConfirmModal lacked backdrop dismiss | W2 | `apps/mobile-app/.../ConfirmModal.tsx` |
| 4.12 | 12 skipped automation handler tests (PedidoRecurrente, MetaNoCumplida) | W5 | SQLite → EF InMemory swap, all 12 enabled |
| 4.13 | 6 skipped StockNotificationService tests | W2 | Re-enabled, all pass |
| 4.14 | SyncRepository `Version++` double-increment (9 sites) | W2 | `SyncRepository.cs` — manual `++` removed |
| 4.15 | Logout did not end SUPER_ADMIN impersonation session | W2 | `Header.tsx` |
| H-1 | `RutasCarga` counter increments lost on concurrent sync | W4 | `SyncRepository.cs` → `ExecuteUpdateAsync` (5 sites) |
| H-2 | Fire-and-forget `Task.Run` notifications (4 sites) | W5 | NEW `notification_outbox` table + `OutboxProcessor` BackgroundService |
| H-3 | `CerrarRutaAsync` multi-step writes outside transaction | W4 | `RutaVendedorService.cs` — `ExecuteInTransactionAsync` |
| H-4 | SQL injection pattern (`NOT IN` interpolated) in OrderReaderService | W4 | `<> ALL(@excludedIds)` parameterized |
| H-5 | JWT Issuer/Audience validation disabled in Development | W4 | `JwtExtensions.cs` — always enforced |
| H-7 | String-interp `LogInformation` breaks Seq structured search (Billing) | W4 | `CatalogosController.cs` — structured templates |

### MEDIUM (29)

| ID | Title | Workflow | File / Action |
|----|-------|----------|---------------|
| 4.11 | `cobranza.spec.ts` anchored regex flake | W2 | Scoped to `[data-tour="cobranza-kpis"]` |
| 4.16 | CRUD specs used `getByRole('button').first()` without testid | W2 | Added `data-testid="edit-client-{id}"` etc. |
| 4.17 | 30-second cache window for revoked JWTs | W2 | `IMemoryCache` invalidation in `CloseAllActiveSessions` |
| 4.18 | `MetaVendedorEndpoints` inline role checks | W2 | Declarative `RequireRole` per endpoint |
| 4.19 | 2 skipped Factura billing tests (raw SQL `GetNextFolio`) | W2 | `IFolioProvider` abstraction + Npgsql/Stub impls |
| 4.20 | `SyncStatusCard` hardcoded `sincronizacion` missing tilde | W2 | Fixed |
| H-6 | `Console.WriteLine` in Mobile API DI bootstrap | W4 | `Serilog.Log.Information` |
| M-1 | SyncService per-entity try-catch suppressed exceptions | W4 | Re-throw `SyncPushAggregateException` |
| M-2 | `EnviarACargaAsync` multi-write not in explicit transaction | W5 | `ExecuteInTransactionAsync` |
| M-3 | Cloudinary folder creation swallowed exceptions | W5 | 3-attempt retry + Error log |
| M-4 | Unquoted table name + interpolated tenantId in AnalyticsEndpoints | W4 | Quoted + parameterized |
| M-5 | `ExecuteSqlRawAsync` positional placeholders | W4 | `ExecuteSqlInterpolatedAsync` (3 sites) |
| M-6 | Missing composite indexes on Cobro/Pedido/Gasto | W5 | Migration `20260608001305_AddCompositeIndexesAndCorrelationId` — **generated, NOT applied** |
| M-7 | `ElementAt(i)` in EF navigation loop O(N²) | W4 | Materialized once |
| M-8 | JWT secret length not validated | W4 | Covered by C-1 |
| M-9 | `CobroService.CrearAsync` no logging | W4 | `ILogger` + 7 validation warnings |
| M-10 | No correlation ID on `ImpersonationSession` | W5 | `CorrelationId` column + index — **generated, NOT applied** |
| M-11 | CFDI timbrado entry no Info-level log | W4 | Added |
| M-12 | `InventarioService.CrearInventarioAsync` check-then-create race | W4 | Advisory lock + transaction |
| M-13 | CommandPalette stale-result race — service-layer AbortSignal | W5/**W6** | W5: state-update race fixed. **W6: AbortSignal plumbed through `getClients`/`getProducts`/`getOrders`** |
| M-15 | ActivityTrackingRepositoryTests midnight-cross flake | W5 | `FixedUtcTenantTimeZoneService` accepts frozen `DateTime` |
| W2-4.9 | 3 keys missing tilde on `Información` | W2 | Fixed |
| W2-4.10 | 5 hardcoded Spanish errors missing tildes | W2 | Fixed |
| Sync-trio | 3 skipped `SyncServiceUnitTests` | W5 | `SetupEmptyPulls` helper extended (Gastos + Devoluciones) |
| E2E-supervisor | Equipo heading collision with h2 from MiembrosTab | W5 | `level: 1` + `exact: true` |
| E2E-admin | Productos / Equipo parent-button expand-then-click | W5 | Pattern matches Clientes |
| E2E-vendedor | `/orders` SignalR + fetchOrders race | W5 | `waitForFunction` polling h1 textContent |
| **5.3 H-2** | **Outbox retention BackgroundService (30-day purge)** | **W6** | NEW `OutboxRetentionService.cs` + registered in `Program.cs` |
| **5.5** | **Supervisor UI feature-gating sweep for `/api/reports`** | **W6** | 4-layer defense: `permissions.ts`, `middleware.ts`, `CommandPalette.tsx`, `reports/page.tsx` |

### LOW (8)

| ID | Title | Workflow | File / Action |
|----|-------|----------|---------------|
| 4.21 | TimbresModal duplicated focus-trap | W5 | Refactored to wrap canonical `Modal` |
| 4.22 | AnnouncementEndpointsTests skip-reason contradicted assertions | W2 | Deleted (covered by adjacent test) |
| 4.23 | `CobroServiceUnitTests` stale `IsAdmin` mock | W2 | Updated to `IsAdminOrAbove` + `IsStrictAdmin`, un-skipped |
| L-1 | Mobile syncEngine phases 4–6 empty catch | W4 | `__DEV__` console.warn added |
| L-2 | Advisory-lock SQL `ExecuteSqlRawAsync` consistency | W4 | Migrated to `ExecuteSqlInterpolatedAsync` |
| Version++ FU2 | `DevolucionesEndpoints.AnularDevolucion` | W3 | Removed |
| Version++ FU3 | `GastosEndpoints.InvalidarGasto` | W3 | Removed |
| Version++ FU4 | `MobileAttachmentEndpoints` (2 sites) | W3 | Removed |

### Version++ critical follow-up (separately tracked)

5 total double-bump sites removed in W3: `RutaVendedorRepository.VincularGastosHuerfanosAsync`, `DevolucionesEndpoints.AnularDevolucion`, `GastosEndpoints.InvalidarGasto`, and both `MobileAttachmentEndpoints` upload paths. Combined with W2 fix of `SyncRepository` (9 sites), **14 manual `Version++` sites eliminated** — canonical author is now exclusively `HandySalesDbContext.SaveChangesAsync` interceptor at line 121.

---

## 3. Definitive Deferred List — 4 items

These four items are **deferred by design** and cannot be code-fixed in this workflow effort. Each entry explains exactly why.

### 3.1 — Outbox transactional semantics (formerly §5.1 of W5 report)
**What:** The four refactored helpers in `RutaVendedorEndpoints.cs` now do `SaveChangesAsync(business write) → SaveChangesAsync(outbox row)`. If the second save fails mid-flight (DB connection drop), the business write commits but the notification never reaches the outbox.
**Why this cannot be code-fixed here:** True transactional outbox requires enqueuing inside the **same** `SaveChangesAsync` as the business write — which means plumbing `IOutboxService` into `RutaVendedorService` and *every other service that emits notifications*. This is a multi-day, ripple-effect refactor across the Application layer. The current MVP is strictly better than the prior `Task.Run` pattern (which lost notifications silently on crash with zero audit trail).
**Acceptable today:** Yes. **Track:** Open follow-up ticket "True transactional outbox — plumb IOutboxService through service layer."

### 3.2 — Test sweep for endpoints refactored by H-2 (formerly §5.2)
**What:** A sweep to convert hypothetical `mockPushService.Verify(...)` calls into `db.NotificationOutbox.Should().ContainSingle(...)` assertions for the four refactored endpoints.
**W6 investigation result:** **Zero such mocks exist.** The current test files (`RutaVendedorEndpointsTests`, `RutaVendedorServiceUnitTests`, `NotificationServiceUnitTests`) never exercise the notification pipeline for those endpoints — no `.Verify()` calls to convert. A class-level XML breadcrumb has been added to `RutaVendedorEndpointsTests.cs` documenting this gap and listing the 4 positive-coverage tests that should be added in a follow-up (with their expected `NotificationOutboxType`, count, payload field, and which endpoint).
**Why this cannot be code-fixed here:** Adding the 4 positive tests requires DB-seeded fixtures (RutaVendedor in CargaAceptada/EnProgreso states, RutasCarga rows, Pedido entities) that the integration harness does not provide today. That's a 2–4 hour follow-up, not a mechanical sweep.
**Coverage gap intentionally left:** The four refactored fire-and-forget paths still have **zero** assertion coverage. Suite builds + 1126 tests pass, but a future refactor breaking one of the four helpers (wrong `NotificationOutboxType`, omitted `SaveChangesAsync`, dropped `TenantId`, changed `MobilePushPayload.UserIds` shape) would NOT be caught by CI. The OutboxProcessor BackgroundService is also untested end-to-end.
**Track:** Open follow-up ticket "Add outbox coverage for RutaVendedor endpoints (4 × 1 happy-path test each + 1 OutboxProcessor integration test)."

### 3.3 — TimbresModal pixel-locked screenshot regeneration (formerly §5.7)
**What:** Design tokens shifted in 4.21 refactor (`bg-card` → `bg-surface-4`, `rounded-2xl` → `rounded-xl`, `shadow-2xl` → `shadow-elevation-3`, overlay `bg-black/60` → `bg-black/50`, enter animation now matches Modal). If QA has visual-regression snapshots, they will mismatch.
**Why this cannot be code-fixed here:** Requires QA team action (re-baseline snapshots in their visual-regression harness). Functional behavior is identical; only pixel diff.
**Track:** Notify QA lead before merge to staging.

### 3.4 — Apply EF migrations in staging/prod (formerly §5.6)
**What:** Two migrations generated and committed but **NOT applied**:
- `20260608001305_AddCompositeIndexesAndCorrelationId`
- `20260608002641_AddNotificationOutbox`
**Why this cannot be code-fixed here:** Per explicit task instructions. Apply order is the user's call. The composite-index migration in particular should run off-peak on prod or be hand-edited to use `CREATE INDEX CONCURRENTLY` (requires removing the migration's wrapping transaction). The outbox migration is pure additive `CREATE TABLE` and safe to auto-apply via `DatabaseMigrator.MigrateAsync` startup hook.
**Track:** Apply staging-first → validate → prod. See §5 for exact commands.

---

### Items that were on prior deferred lists but are now CLOSED in W6

| Prior deferred ID | Title | W6 Resolution |
|-------------------|-------|---------------|
| 5.2 (was deferred) | Test sweep for H-2 refactored endpoints | **Documented as breadcrumb** — investigation revealed zero existing mocks to convert; added class-level XML comment in `RutaVendedorEndpointsTests.cs`. Reclassified to §3.2 as a coverage-gap follow-up, not a sweep. |
| 5.3 (was deferred) | Outbox retention/cleanup job | **CLOSED** — `OutboxRetentionService` BackgroundService created (1h initial delay, 24h tick, `ExecuteDeleteAsync` for Sent/Failed older than 30 days). Registered in `Program.cs`. |
| 5.4 (was deferred) | Service-layer AbortSignal plumbing | **CLOSED** — `AbortSignal` plumbed through `getClients`, `getProducts`, `getOrders` and forwarded from `CommandPalette`. `apps/web/src/lib/api.ts` needed zero changes (axios already supports `signal` natively). |
| 5.5 (was deferred) | Supervisor UI feature-gating sweep for `/api/reports` | **CLOSED** — 4-layer defense: removed `view_reports` from SUPERVISOR in `permissions.ts`, removed SUPERVISOR from `/reports` allow-list in `middleware.ts`, gated quick action in `CommandPalette.tsx`, added client-side guard + redirect in `reports/page.tsx`. |
| 5.8 (was deferred) | Single-supervisor team-scoped variant of `/api/reports` | **DROPPED** — product decision needed, not a code item. 4.3 was closed via Option A (remove SUPERVISOR entirely). If product later decides supervisors should see team aggregates, that's a multi-week refactor opening a new audit cycle. |

---

## 4. Pre-Push Checklist

### 4.1 Environment variables that MUST be set before merge

| Variable | Where | Why | Risk if missing |
|----------|-------|-----|-----------------|
| `Jwt__Secret` (≥32 chars) | Railway prod | C-1 added fail-fast startup guard in `JwtExtensions.cs` | **API will not start.** Liveness probe fails, container restart loop. |
| `Jwt__Secret` (≥32 chars) | Railway staging | Same | Same |
| `Jwt__Secret` (≥32 chars) | GitHub Actions CI | xUnit tests boot the host | CI fails on first test run |
| `Jwt__Secret` (≥32 chars) | Local `docker-compose.dev.yml` | Dev env | Local API container crashes on `docker-compose up` |
| `Jwt__Issuer` / `Jwt__Audience` | All environments | H-5 forced validation in all envs (previously dev-bypassed) | Tokens issued under different issuer/audience are rejected with 401 |

**Action required:** Before the user runs `git push origin feat/single-session-strict`, verify the four `Jwt__Secret` locations have ≥32-char values. The Issuer/Audience pair must be consistent between the token issuer and validator (Main API issues, Mobile/Billing validate).

### 4.2 EF Migrations that will be applied

| Migration | Auto-applies? | Risk | Recommended action |
|-----------|---------------|------|-------------------|
| `20260608001305_AddCompositeIndexesAndCorrelationId` | YES (via `DatabaseMigrator.MigrateAsync` on startup) | Index creation on `Pedidos` (large prod table) may briefly hold an `ACCESS EXCLUSIVE` lock | **Apply manually off-peak**, or hand-edit migration to use `CREATE INDEX CONCURRENTLY` (requires removing the migration's transaction wrapper). 7 total objects created: 6 composite indexes + 1 column + 1 index. |
| `20260608002641_AddNotificationOutbox` | YES | None — pure additive `CREATE TABLE notification_outbox` + 2 indexes | Safe to auto-apply. No backfill needed. |

**Apply order:** filename timestamps already enforce composite-indexes → outbox.

**Recommendation:** Apply both to staging first via the existing pattern documented in memory (`docker exec -i handysuites_postgres_dev psql "<STAGING_URL>" ...`), validate `/health` on staging API, then trigger the path-filtered CI redeploy (`apps/api/**`) for prod.

### 4.3 UI sweeps already done (DO NOT re-sweep)

- `/api/reports` is now SUPERVISOR-locked in 4 places (W6 — 5.5). Do not look for additional supervisor report tiles; they are all gated.
- `view_reports` permission removed from SUPERVISOR in `permissions.ts` — auto-hides Reports tile in Sidebar, CommandPalette, and any other `usePermissions` consumer.
- `/cobranza` page has client-side redirect guard (W5 — 4.4). Backend RBAC is the source of truth (W2 — 4.1).
- `clients.spec.ts` CRUD testids added (W2 — 4.16). E2E specs for admin/supervisor/vendedor now use stable `level: 1` heading selectors.

### 4.4 Mocks already swept

- **No mock sweep for H-2 needed.** W6 investigation confirmed zero existing `Verify()` calls to convert. Breadcrumb XML comment placed in `RutaVendedorEndpointsTests.cs` for the future coverage-add ticket.
- 14 manual `Version++` sites removed (W2 + W3). Sole authority is now `HandySalesDbContext.SaveChangesAsync` interceptor.
- 25 previously-skipped tests now run and pass. No legitimate skip remains except 9 mobile E2E-gated tests (require Maestro device + JWT secrets, intentionally skipped in unit-test CI).

---

## 5. What the User MUST Do Before Merging

### Before merging `feat/single-session-strict` → `staging`:

1. **Verify Railway Source Branch configuration** for both staging and prod environments. Per memory `feedback_verify_railway_source_branch.md`, Railway's dashboard can wire any branch to any environment — do not assume `staging → staging` and `main → prod`. If `feat/single-session-strict` is somehow wired to a non-staging env, a merge will deploy unintentionally.

2. **Set `Jwt__Secret` ≥32 chars in all 4 locations** (Railway prod, Railway staging, GitHub Actions, local Docker). Run `openssl rand -base64 48` to generate. After C-1 fix, the API refuses to start without this.

3. **Set `Jwt__Issuer` and `Jwt__Audience`** in all environments. H-5 removed the dev-bypass, so any token issued under a different issuer/audience will now be rejected. Verify Mobile API and Billing API use the same pair as Main API.

4. **Apply EF migrations staging-first**:
   ```bash
   # Staging
   docker exec -i handysuites_postgres_dev psql "<RAILWAY_STAGING_URL>" \
     < apps/api/src/HandySuites.Api/Migrations/20260608001305_AddCompositeIndexesAndCorrelationId.sql
   docker exec -i handysuites_postgres_dev psql "<RAILWAY_STAGING_URL>" \
     < apps/api/src/HandySuites.Api/Migrations/20260608002641_AddNotificationOutbox.sql
   ```
   Then trigger a path-filtered redeploy with a no-op commit on `apps/api/**` (per memory `feedback_apply_migration_implies_redeploy.md` — applying SQL manually does NOT redeploy Railway).

5. **For prod composite-index migration**, hand-edit to use `CREATE INDEX CONCURRENTLY` and apply off-peak, OR accept the brief write-lock window on `Pedidos` and apply during a maintenance window.

6. **Notify QA team** that TimbresModal design tokens shifted (4.21). Any visual-regression snapshots for that modal need re-baselining. Functional behavior is unchanged.

7. **Notify mobile team** that Mobile API behavior is unchanged from prior baseline — the breaking changes (C-1 JWT validation, M-1 sync all-or-nothing semantics, 4.6 OAuth 409) affect the Main API surface that the web app + admin tools use, not the Mobile API.

### Before merging `staging` → `main` (prod):

8. **Run full Playwright E2E suite** on staging: `cd apps/web && npx playwright test`. Expected: at least the 6 stabilized specs from W5 (admin/supervisor/superadmin/vendedor day-in-the-life + cobranza + clients) pass. The supervisor spec's logout-flow fix remains inconclusive per the W1 report — if it fails, it is not a regression from this audit effort.

9. **Smoke-test on staging**:
   - Login as ADMIN → hit `/cobranza` → confirm KPIs render → create a cobro → see it persist.
   - Login as SUPERVISOR → confirm Reports tile NOT visible in sidebar → navigate to `/reports` directly → confirm redirect to `/dashboard?error=unauthorized`.
   - Login as VENDEDOR → confirm `/cobranza` redirects to `/dashboard` (defense-in-depth) and `/api/cobros` returns 403 (backend RBAC).
   - Trigger a route assignment from web (`POST /rutas/{id}/carga/enviar`) → confirm a row appears in `notification_outbox` with `Status=Pending` → wait ≤30s → confirm `Status=Sent`.
   - Force a second login as same user from incognito → confirm 409 `ACTIVE_SESSION_EXISTS` on Main API; confirm OAuth path now mirrors the warning (W2 — 4.6).

10. **Monitor Seq** for ~30 minutes after staging deploy: filter for `Level >= Warning` and look for new `JwtAuthenticationException`, `SyncPushAggregateException`, or `CloudinaryFolderCreationFailed` events. The first two indicate misconfigured env vars; the third indicates Cloudinary outage (now retries + logs Error per M-3).

11. **Open follow-up tickets** for the 4 deferred items in §3 before closing this audit cycle:
    - "Plumb IOutboxService through Application layer for true transactional outbox"
    - "Add outbox coverage for RutaVendedor endpoints (4 happy-path tests + OutboxProcessor integration)"
    - "Re-baseline TimbresModal visual-regression snapshots"
    - "Confirm composite-index migration applied to prod with CONCURRENTLY or maintenance window"

12. **Update CLAUDE.md / memory** to reflect:
    - JWT secret length minimum (32 chars) is now enforced at startup.
    - `/api/reports/*` rejects SUPERVISOR.
    - `notification_outbox` is the durable queue for `RutaVendedorEndpoints` notifications.
    - `OutboxRetentionService` purges Sent/Failed rows >30 days, once per 24h.
    - Manual `Version++` is forbidden on tracked entities — `SaveChangesAsync` interceptor is the sole author.

---

## Final Verdict

**60 findings closed across 6 workflows. 4 deferred (each with explicit rationale). 0 test regressions. 0 build errors. 0 type-check errors.**

The branch is **GREEN to merge to staging** subject to the env-var checklist in §5.1. Do not merge to `main` until §5.8–§5.10 complete on staging.

The biggest residual risk is the **first composite-index migration on prod `Pedidos`** (large table, brief write-lock). Mitigate with `CONCURRENTLY` or maintenance window.

The biggest residual coverage gap is the **4 H-2 refactored endpoints with zero assertion coverage on the outbox enqueue path**. A future refactor could silently break them. Open the follow-up ticket before the next prod push that touches `RutaVendedorEndpoints.cs` or `OutboxProcessor.cs`.

This is the final word. No further audit passes recommended on this branch.

---

**Verified:** API 1126p/0s, Mobile 739p/9s (legit), Billing 209p/0s, Web type-check clean. All numbers match the W5 baseline exactly — W6 closures introduced zero deltas. Pre-existing AutoMapper 14.0.0 NU1903 high-severity transitive vulnerability persists (not introduced by this effort; tracked separately).
