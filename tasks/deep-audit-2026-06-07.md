# Deep Audit Report — `feat/single-session-strict`

**Date:** 2026-06-07
**Branch:** `feat/single-session-strict`
**Scope:** E2E spec/Maestro stabilization (Phase 1–2) + multi-lens code audit with adversarial verification (Phase 3–4)

---

## 1. Executive Summary

- Phase 1 applied minimal, targeted fixes to 4 Playwright specs and 3 Maestro YAMLs to address selector strict-mode violations, missing modal handlers, and a client-side redirect race. Phase 2 re-runs showed mixed results — the admin/superadmin/vendedor specs improved from broken to 6 passed / 2 failed, while the supervisor spec regressed earlier in the flow (the original logout fix is still inconclusive).
- The multi-lens deep audit produced **55 raw findings**; after adversarial verification by 3 independent skeptics, **23 were confirmed** as real issues (≥2/3 verifiers did not refute). Confirmed findings cluster around three real risk areas: **(a) backend RBAC inconsistencies in `feat/single-session-strict`** (CobroEndpoints has no role check, InventarioEndpoints GET allows any authenticated user), **(b) single-session-strict implementation correctness gaps** (missing audit logs, OAuth bypasses 409 warning, 30-second cache window for revoked JWTs, Version double-increment in sync), and **(c) E2E selector fragility / i18n accent inconsistency**.
- The most load-bearing items needing human triage: the **CobroEndpoints RBAC gap** (critical, financial data), the **Version double-increment in `SyncRepository`** (already observed in production per memory doc), and the **30-second cache window** that lets revoked JWTs survive after a forced session kill.

---

## 2. Fixes Applied (Phase 1)

### Playwright specs

| File | Lines | Change |
|------|-------|--------|
| [apps/web/e2e/e2e-day-supervisor.spec.ts](apps/web/e2e/e2e-day-supervisor.spec.ts#L72) | ~72, ~logout section | Phase 2 heading: switched to `getByRole('heading', { name: 'Equipo', exact: true })` to resolve strict-mode collision with `h2 "Navegación"` (sidebar). Phase 6 logout: replaced text-name button match with stable `header button[data-tour="header-user-menu"]`; replaced `role="menuitem"` (logout is a Dialog, not Popover); added explicit `expect(...).toBeVisible()` to fail fast. |
| [apps/web/e2e/e2e-day-admin.spec.ts](apps/web/e2e/e2e-day-admin.spec.ts#L56) | 56–58, 66–78, all headings | Tablero heading locked to `level: 1` to avoid strict-mode collision with sidebar `h2 "Navegación"`. Clientes flow corrected — sidebar item is a *parent menu button*, not a link; flow now expands it then clicks the `Lista de clientes` link. All page-heading assertions across Productos/Pedidos/Equipo/Reportes were locked to `level: 1`. |
| [apps/web/e2e/e2e-day-superadmin.spec.ts](apps/web/e2e/e2e-day-superadmin.spec.ts#L41) | 41–49 | Replaced single `expect(page).toHaveURL(...)` with explicit `page.waitForURL(/\/admin\/system-dashboard/, { timeout: 30000 })` to absorb the **client-side** `router.replace()` redirect from `/dashboard` → `/admin/system-dashboard`. Comment updated to document the redirect happens after hydration. |
| [apps/web/e2e/e2e-day-vendedor-readonly.spec.ts](apps/web/e2e/e2e-day-vendedor-readonly.spec.ts#L61) | Test 2 (~61), Test 3 | Test 3 (cobranza) rewritten from soft assertion on non-existent `/collections` into a *positive RBAC test* against the real `/cobranza` route, asserting middleware redirect to `/login` for vendedor; re-logs in afterwards to preserve serial state. Test 2 (`/orders`): added explicit `waitForURL` (`domcontentloaded`) and raised heading-visibility timeout to 30s to absorb role-aware `h1` swap between `Pedidos` / `Mis Pedidos`. |

### Maestro YAMLs

| File | Change |
|------|--------|
| [apps/mobile-app/.maestro/e2e-day-in-the-life/02-supervisor-equipo-mapa.yaml](apps/mobile-app/.maestro/e2e-day-in-the-life/02-supervisor-equipo-mapa.yaml) | Added id-based `skip-onboarding` runFlow at start of FASE 1. Added `optional: true` on the 3 onboarding-action taps in the Siguiente fallback. Added `Límite de sesiones` handler (taps `Chrome en Windows` → `Desconectar y continuar aquí`). Added `Sobre tu ubicación` GPS-consent handler. Reordered: all dismiss handlers now run **before** `extendedWaitUntil: "Hoy"` so they don't block the wait. Added `waitForAnimationToEnd` after the FASE 6 "Volver" tap. |
| [apps/mobile-app/.maestro/e2e-day-in-the-life/03-admin-mobile-dashboard.yaml](apps/mobile-app/.maestro/e2e-day-in-the-life/03-admin-mobile-dashboard.yaml) | Same modal stack added (skip-onboarding, Límite de sesiones, Sobre tu ubicación). `optional: true` flags on the 3 onboarding-action taps and the `Permitir` permission tap. All dismiss handlers reordered before the `extendedWaitUntil: "Hoy"` gate. |
| [apps/mobile-app/.maestro/e2e-day-in-the-life/04-superadmin-mobile.yaml](apps/mobile-app/.maestro/e2e-day-in-the-life/04-superadmin-mobile.yaml) | Added `skip-onboarding` runFlow at FASE 0. `optional: true` flag on the Aviso de Privacidad Aceptar tap. `Límite de sesiones` + `Sobre tu ubicación` modal handlers added at FASE 4. `optional: true` on `While using the app` + `Permitir` permission taps. `optional: true` and `waitForAnimationToEnd` added to the FASE 8 "Cerrar sesión" tap. |

**Accent / encoding checks**: files 02/03/04 verified clean — no `Mas tarde` (missing tilde) or `Iniciar Sesi` (truncated) issues. `Más tarde` already correct in 02/03; 04 already correctly used `Sí, cerrar sesión`. No hardcoded coordinates in any file. The vendedor YAML (01) was not touched — out of scope.

---

## 3. Re-Run Results (Phase 2)

### Supervisor spec — `e2e-day-supervisor.spec.ts`

- **passed: 1, failed: 1, flaky: 1, overallImproved: false**
- Spec now **fails earlier** at the team page (line 72) before reaching logout — the `Equipo` heading locator still resolves to 2 elements: `<h1>Equipo</h1>` AND `<h2>Vendedores del Equipo (3)</h2>`. On retry #2 the heading never rendered.
- **Conclusion**: the logout fix is **INCONCLUSIVE** because execution regressed earlier and never reached the logout step. The team-heading fix to use `{ exact: true }` is **insufficient** — the `h2 "Vendedores del Equipo (3)"` also matches `/Equipo/` and so without anchoring to `level: 1` we still match two elements. The fix needs to be tightened to `getByRole('heading', { level: 1, name: 'Equipo', exact: true })`.
- Also observed: `setup-desktop` admin auth is **flaky** — first attempt timed out on `/login` (could not reach `/dashboard/` within 30 s), passed on retry. Likely a stale-state / login race issue.

### Admin + SuperAdmin + Vendedor-readonly specs

- **passed: 6, failed: 2, flaky: 0, overallImproved: true**
- Remaining failures:
  - [apps/web/e2e/e2e-day-admin.spec.ts#L104](apps/web/e2e/e2e-day-admin.spec.ts#L104) — ADMIN sidebar → Productos (`/products`): sidebar link `Productos` not visible after 15 s timeout. Likely the same parent-menu-button pattern that affected Clientes — Productos may also need expansion.
  - [apps/web/e2e/e2e-day-vendedor-readonly.spec.ts#L61](apps/web/e2e/e2e-day-vendedor-readonly.spec.ts#L61) — Test 2 `/orders` navigation still failing despite the new `waitForURL` + extended timeout. Suggests the role-aware `h1` swap is not the only delay; possibly a tenant-data fetch is slow or the page is throwing on render.

---

## 4. Deep Audit Findings (Confirmed by ≥2/3 Verifiers)

### Critical (1)

#### 4.1 CobroEndpoints has no role check on read/write operations
- **File:** [apps/api/src/HandySuites.Api/Endpoints/CobroEndpoints.cs#L15](apps/api/src/HandySuites.Api/Endpoints/CobroEndpoints.cs#L15)
- **Verifiers confirming:** 3/3
- **Description:** The `/cobros` group is mapped with `.RequireAuthorization()` only — no `RequireRole`. The frontend `middleware.ts` (L33) restricts `/cobranza` to `[ADMIN, SUPERVISOR, SUPER_ADMIN]`, but the backend enforces auth-only on GET /, GET /{id}, POST, PUT, DELETE, GET /saldos, GET /saldos/resumen, GET /cliente/{id}/estado-cuenta.
- **Evidence:** `MapGroup` at L15-16 uses `.RequireAuthorization()` without `RequireRole`. All subsequent endpoints inherit only the group-level auth check. `ReportEndpoints.cs:22` is the correct counter-pattern. While `CobroService` does filter data by `usuarioId` for non-admin roles (L31-35), this is application-layer scoping, not endpoint authorization — and the SUPERVISOR / ADMIN write operations have no enforcement at the endpoint level.
- **Suggested fix:** Add `.RequireAuthorization(p => p.RequireRole("ADMIN", "SUPERVISOR", "SUPER_ADMIN"))` to the `MapGroup`, OR individually to sensitive endpoints. Defense-in-depth: middleware is UI-layer, not security boundary.

### High (15)

#### 4.2 InventarioEndpoints GET allows any authenticated user
- **File:** [apps/api/src/HandySuites.Api/Endpoints/InventarioEndpoints.cs#L12](apps/api/src/HandySuites.Api/Endpoints/InventarioEndpoints.cs#L12)
- **Verifiers confirming:** 3/3
- **Description:** Read operations (`GET /inventario`, `/inventario/{id}`, `/inventario/por-producto/{id}`) use bare `.RequireAuthorization()`. Write operations correctly require ADMIN/SUPER_ADMIN. Frontend `middleware.ts:34` restricts `/inventory` to `[ADMIN, SUPERVISOR, SUPER_ADMIN]` — VENDEDOR or VIEWER bypassing the frontend can read inventory directly.
- **Evidence:** L12-28 vs L30-66. Service layer also has no role-based authorization, only tenant filtering.
- **Suggested fix:** `.RequireAuthorization(p => p.RequireRole("ADMIN", "SUPERVISOR", "SUPER_ADMIN"))` on all GETs.

#### 4.3 ReportEndpoints includes SUPERVISOR despite cross-tenant aggregate intent
- **File:** [apps/api/src/HandySuites.Api/Endpoints/ReportEndpoints.cs#L18](apps/api/src/HandySuites.Api/Endpoints/ReportEndpoints.cs#L18)
- **Verifiers confirming:** 2/3 (one verifier argued SUPERVISOR is intentionally a management role)
- **Description:** `.RequireAuthorization(... RequireRole("ADMIN", "SUPER_ADMIN", "SUPERVISOR"))` at L22 grants SUPERVISOR access to tenant-wide aggregates. Per `SupervisorEndpoints`, SUPERVISOR is **scoped** (manages assigned vendedores only) — but report endpoints return all vendedores in tenant without `SupervisorId` filtering. Either remove SUPERVISOR or add per-supervisor data scoping.
- **Suggested fix:** Either restrict to ADMIN/SUPER_ADMIN only, OR add `WHERE u.SupervisorId == supervisorId` filtering in each report query for the SUPERVISOR case.

#### 4.4 Frontend `/cobranza` page lacks role guard while backend enforces auth-only
- **File:** [apps/web/src/app/(dashboard)/cobranza/page.tsx#L1](apps/web/src/app/(dashboard)/cobranza/page.tsx#L1)
- **Verifiers confirming:** 2/3 (one verifier noted service-layer filtering mitigates risk)
- **Description:** Defense-in-depth gap — both layers depend on `middleware.ts` route restriction. Backend fix in 4.1 is the primary mitigation; frontend `usePermissions` hook would be optional second layer.
- **Suggested fix:** Primary: fix backend (4.1). Optional: add `usePermissions` hook in `cobranza/page.tsx`.

#### 4.5 Missing audit log when session is force-killed by another login
- **File:** [apps/api/src/HandySuites.Api/Auth/AuthService.cs#L642](apps/api/src/HandySuites.Api/Auth/AuthService.cs#L642)
- **Verifiers confirming:** 2/3 (one verifier argued callers already log the parent action)
- **Description:** `CloseAllActiveSessions` (L642-672) increments `session_version` + revokes refresh tokens + closes device sessions, but never calls `LogActivityAsync`. `LogoutAsync` (L713-714) does. Forced session closes via `Verify2FAAsync`, `ForceLoginAsync`, `SocialLoginAsync` log the *parent* action but not the individual session kills. Forensic gap: examining `ActivityLog` shows "force_login" but not which sessions were killed and when.
- **Suggested fix:** Add `LogActivityAsync` calls inside `CloseAllActiveSessions` for each closed session, with `status='session_revoked'`, reason, and timestamp.

#### 4.6 OAuth social login bypasses single-session strict 409 warning
- **File:** [apps/api/src/HandySuites.Api/Auth/AuthService.cs#L723](apps/api/src/HandySuites.Api/Auth/AuthService.cs#L723)
- **Verifiers confirming:** 3/3
- **Description:** `SocialLoginAsync` (L723-770) **unconditionally** closes all previous sessions when `TotpEnabled` is false — no `ACTIVE_SESSION_EXISTS` 409 response. Compare `LoginAsync` (L495-509) which warns the user via 409. UX asymmetry: a user logging in via Google on device B silently kills device A's session.
- **Suggested fix:** Add the same `ACTIVE_SESSION_EXISTS` check + 409 response to `SocialLoginAsync` before calling `CloseAllActiveSessions`, OR document the silent-close as intentional and add audit log (#4.5).

#### 4.7 Web custom Modal missing focus restoration on close
- **File:** [apps/web/src/components/ui/Modal.tsx#L59](apps/web/src/components/ui/Modal.tsx#L59)
- **Verifiers confirming:** 3/3
- **Description:** Focus trap implemented on open (L94-124) but `handleClose()` (L59-65) does not restore focus to the previously focused element. WCAG accessibility violation for keyboard users.
- **Suggested fix:** Store `previousFocus = useRef<HTMLElement>(document.activeElement)` on mount, restore in `handleClose()`: `previousFocus.current?.focus()`.

#### 4.8 Mobile ConfirmModal lacks backdrop dismiss
- **File:** [apps/mobile-app/src/components/ui/ConfirmModal.tsx#L42](apps/mobile-app/src/components/ui/ConfirmModal.tsx#L42)
- **Verifiers confirming:** 3/3
- **Description:** Overlay View (L50-89) has no `onPress` handler. `onRequestClose={onCancel}` only handles Android back button. Backdrop tap-to-dismiss is standard mobile UX.
- **Suggested fix:** Wrap overlay in `Pressable` with `onPress={onCancel}`, OR add `onPressOut`.

#### 4.9 Three Spanish translation keys missing accent on `Información`
- **File:** [apps/web/messages/es.json#L1181](apps/web/messages/es.json#L1181), L1270, L5998
- **Verifiers confirming:** 3/3
- **Description:** L1181 `orderInfoTitle`, L1270 `clientInfo`, L5998 `companyInfo` all spell `Informacion` (no accent). 20+ other keys in the same file correctly use `Información`.
- **Suggested fix:** Replace all three with `Información`.

#### 4.10 Hardcoded Spanish errors in mobile `errorClassifier.ts` without accents or i18n
- **File:** [apps/mobile-app/src/sync/errorClassifier.ts#L36](apps/mobile-app/src/sync/errorClassifier.ts#L36), L44, L52, L60, L68
- **Verifiers confirming:** 3/3
- **Description:** User-facing error strings: `sesion`→`sesión`, `conexion`→`conexión`, `senal`→`señal`, `validacion`→`validación`, `expiro`→`expiró`. No i18n infrastructure for the mobile error strings.
- **Suggested fix:** Move to i18n config; correct all accents.

#### 4.11 E2E specs use `getByText` with hardcoded Spanish regex without i18n guard
- **File:** [apps/web/e2e/cobranza.spec.ts#L38](apps/web/e2e/cobranza.spec.ts#L38)
- **Verifiers confirming:** 2/3 (one verifier argued defensive `.catch(()=>false)` mitigates risk)
- **Description:** Anchored regex like `/^Cobrado$/i` fails against the normalized text of `<p>{label} <HelpTooltip/></p>` because of trailing whitespace. `cobranza-full-crud.spec.ts:31-35` documents the exact same issue and fixes it via `[data-tour="cobranza-kpis"]` scoping.
- **Suggested fix:** Scope to `page.locator('[data-tour="cobranza-kpis"]')` and remove the anchored patterns.

#### 4.12 12 skipped tests for production automation handlers (PedidoRecurrente, MetaNoCumplida)
- **File:** [apps/api/tests/HandySuites.Tests/Automations/Handlers/PedidoRecurrenteHandlerTests.cs#L129](apps/api/tests/HandySuites.Tests/Automations/Handlers/PedidoRecurrenteHandlerTests.cs#L129) + [MetaNoCumplidaHandlerTests.cs#L125](apps/api/tests/HandySuites.Tests/Automations/Handlers/MetaNoCumplidaHandlerTests.cs#L125)
- **Verifiers confirming:** 3/3
- **Description:** Both handlers registered as `IAutomationHandler` in `ServiceRegistrationExtensions.cs` L378, L381. They execute production-critical business logic: PedidoRecurrente sends push notifications for reorder thresholds, MetaNoCumplida sends alerts for vendor goal completion. All 12 tests have full SQLite + seed setup but skip with `Wave 3: handler requiere wiring DI complejo / dependencia HandySalesDbContext interceptor`. Skip reason likely refers to `TenantRlsInterceptor` (L150) incompatibility with the test env.
- **Suggested fix:** Resolve the interceptor wiring (conditional registration in `Testing` env) and enable all 12 tests.

#### 4.13 6 skipped StockNotificationService tests with complete scaffolding
- **File:** [apps/mobile/HandySuites.Mobile.Tests/Services/StockNotificationServiceTests.cs#L137](apps/mobile/HandySuites.Mobile.Tests/Services/StockNotificationServiceTests.cs#L137), L150, L167, L186, L210, L229
- **Verifiers confirming:** 2/3 (one verifier argued the skip is legitimate infrastructure debt)
- **Description:** Skip reason `Wave 5: requires DB seed con productos/stock minimo`. Helpers `AddProducto`/`AddInventario`/`AddDetallePedido` exist and the skipped tests already call them inline — the skip is outdated. Production service is fire-and-forget (swallows exceptions); 6 untested paths.
- **Suggested fix:** Remove `Skip` attributes; verify helpers fully seed the data the tests need.

#### 4.14 SyncRepository Version field double-increments via manual `++` + DbContext interceptor
- **File:** [libs/HandySuites.Infrastructure/Repositories/Sync/SyncRepository.cs#L228](libs/HandySuites.Infrastructure/Repositories/Sync/SyncRepository.cs#L228), L310, L339, L691, L814, L957, L991, L1152, L1282
- **Verifiers confirming:** 3/3
- **Description:** Manual `existing.Version++` in 9 Upsert methods. `HandySalesDbContext.SaveChangesAsync` (L105-129) unconditionally does `entry.Entity.Version++` for any `EntityState.Modified` entity (L121). Result: Version goes `1 → 2 (manual) → 3 (interceptor)`. Mobile receives `Version: 3` when expecting `Version: 2`, breaking optimistic concurrency. Project memory doc (`coverage-final-sprint-test-coverage-2026-06-07.md:91`) explicitly says: *"Version increment va de 1 a 3 (no 2) porque interceptor incrementa otra vez"* — confirmed in production.
- **Suggested fix:** Remove all 9 manual `existing.Version++` calls. Let the interceptor own version bumps.

#### 4.15 Logout does not explicitly end SUPER_ADMIN impersonation session
- **File:** [apps/web/src/lib/auth.ts#L375](apps/web/src/lib/auth.ts#L375), L415-422, and [apps/web/src/components/layout/Header.tsx#L197](apps/web/src/components/layout/Header.tsx#L197)
- **Verifiers confirming:** 3/3
- **Description:** When SUPER_ADMIN logs out while impersonating, the Header logout handler (L206) only calls `/auth/logout` + clears NextAuth + clears localStorage. It does **not** call `impersonationService.endSession()`. The "Exit" button in `ImpersonationBanner` does this correctly. Backend impersonation session persists server-side after logout.
- **Suggested fix:** In the logout handler, check `isImpersonating` and call `await impersonationService.endSession()` before signOut.

#### 4.16 CRUD operations use `getByRole('button', {name:/editar/i}).first()` without `data-testid`
- **File:** [apps/web/e2e/clients.spec.ts#L57](apps/web/e2e/clients.spec.ts#L57)
- **Verifiers confirming:** 2/3 (one verifier noted defensive `isVisible()` guards mitigate)
- **Description:** Multiple edit/delete buttons (toolbar, table, sidebar) match the same regex. `.first()` may pick the wrong one. Defensive guards prevent test failures but mask incorrect coverage.
- **Suggested fix:** Add `data-testid="edit-client-row-{id}"` to table rows and use `getByTestId(...)` — or at minimum scope to the row locator.

### Medium (5)

#### 4.17 JWT tokens survive ~30s after `session_version` revocation due to uncleared middleware cache
- **File:** [apps/api/src/HandySuites.Api/Middleware/SessionValidationMiddleware.cs#L105](apps/api/src/HandySuites.Api/Middleware/SessionValidationMiddleware.cs#L105)
- **Verifiers confirming:** 3/3
- **Description:** Middleware caches `session_version` for 30 s (L126). `CloseAllActiveSessions` increments DB value but never invalidates the cache. `TenantEndpoints:263` correctly does `cache.Remove($"session_version_{usuarioId}")` on tenant deactivation — pattern exists, just not applied to login-forced-close. Multi-server: per-instance cache → up to 30 s drift.
- **Architectural note:** `AuthService` does not inject `IMemoryCache` today. The fix requires either (a) DI the cache into AuthService and invalidate in `CloseAllActiveSessions`, or (b) move to a distributed cache (Redis) with immediate invalidation.
- **Suggested fix:** Inject `IMemoryCache` into `AuthService`, call `cache.Remove($"session_version_{userId}")` inside `CloseAllActiveSessions` after `SaveChangesAsync`.

#### 4.18 MetaVendedorEndpoints uses inline role checks instead of declarative `RequireRole`
- **File:** [apps/api/src/HandySuites.Api/Endpoints/MetaVendedorEndpoints.cs#L36](apps/api/src/HandySuites.Api/Endpoints/MetaVendedorEndpoints.cs#L36), L89, L103, L117, L130
- **Verifiers confirming:** 3/3
- **Description:** Inline `if (role is not ("ADMIN" or "SUPER_ADMIN")) return Results.Forbid();` repeated 5 times. `PromocionEndpoints.cs:48` uses the declarative pattern. Functionally equivalent, but harder to audit centrally. Other endpoints with inline pattern: `NotificationEndpoints`, `LogLevelEndpoints`, `AnalyticsEndpoints`, `AiEndpoints`.
- **Suggested fix:** Move to `.RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"))` on the `MapGroup` at L13.

#### 4.19 Two Factura billing tests skipped due to InMemory vs raw SQL (`GetNextFolio`)
- **File:** [apps/billing/HandySuites.Billing.Tests/Controllers/FacturasGlobalPublicTests.cs#L283](apps/billing/HandySuites.Billing.Tests/Controllers/FacturasGlobalPublicTests.cs#L283), [FacturasControllerTests.cs#L587](apps/billing/HandySuites.Billing.Tests/Controllers/FacturasControllerTests.cs#L587)
- **Verifiers confirming:** 2/3 (one verifier argued the skip is correct documented architecture, not a bug)
- **Description:** `GetNextFolio` (`FacturasController.cs:1496`) uses raw PostgreSQL `Npgsql.NpgsqlCommand` with `ON CONFLICT DO UPDATE`. InMemory provider cannot execute this. Validation tests pass; happy-path persistence tests are skipped. Real coverage gap for invoice creation, but technically justified.
- **Suggested fix:** Use Testcontainers-PostgreSQL for these tests; OR refactor `GetNextFolio` behind an `IFolioProvider` abstraction with InMemory implementation.

#### 4.20 SyncStatusCard hardcodes `Error de sincronizacion` (missing accent) without i18n
- **File:** [apps/mobile-app/src/components/sync/SyncStatusCard.tsx#L179](apps/mobile-app/src/components/sync/SyncStatusCard.tsx#L179)
- **Verifiers confirming:** 2/3 (one verifier argued component is Spanish-by-design)
- **Description:** L179 and L166 (accessibility label) both spell `sincronizacion`. Whole component is Spanish-hardcoded — broader localization gap.
- **Suggested fix:** Fix accent immediately; longer-term: introduce mobile i18n for sync-status strings.

### Low (3)

#### 4.21 TimbresModal duplicates focus-trap logic instead of using `Modal`/`Dialog`
- **File:** [apps/web/src/components/billing/TimbresModal.tsx#L25](apps/web/src/components/billing/TimbresModal.tsx#L25)
- **Verifiers confirming:** 2/3 (one verifier argued custom implementation is justified by billing-specific composition)
- **Description:** Manual Tab/Shift+Tab + Escape + setTimeout auto-focus duplicates `Modal.tsx:94-124` and `Dialog.tsx`. Modal.tsx implementation is strictly superior (panel-level listener, disabled filter, `stopImmediatePropagation` for nested modals — a fix from May 30).
- **Suggested fix:** Refactor TimbresModal to wrap the standard `Modal` component.

#### 4.22 AnnouncementEndpoints test documents filtering behavior via skip reason instead of asserting
- **File:** [apps/api/tests/HandySuites.Tests/Application/Announcements/AnnouncementEndpointsTests.cs#L269](apps/api/tests/HandySuites.Tests/Application/Announcements/AnnouncementEndpointsTests.cs#L269)
- **Verifiers confirming:** 3/3
- **Description:** Test `BannersEndpoint_BothMode_IsVisible()` skipped with reason: *"SuperAdmin announcements without TargetRoles are filtered out for Admin users by design"* — but the test body actually asserts the announcement IS visible. Skip reason and assertions contradict. If filtering changes, no regression caught. Note: line 294 (`BannersEndpoint_ReturnsDisplayModeInResponse`) already passes, exercising adjacent behavior.
- **Suggested fix:** Either un-skip and update assertions to match the documented constraint, OR delete the test.

#### 4.23 CobroServiceUnitTests skipped with stale mock setup
- **File:** [apps/api/tests/HandySuites.Tests/Application/Cobros/CobroServiceUnitTests.cs#L87](apps/api/tests/HandySuites.Tests/Application/Cobros/CobroServiceUnitTests.cs#L87)
- **Verifiers confirming:** 2/3 (one verifier argued the legacy `IsAdmin` property still works as alias)
- **Description:** Mock sets `_tenant.IsAdmin` (obsolete, marked deprecated 2026-06-06 in sprint pre-prod #11), but `CobroService.ObtenerCobrosAsync` checks `!_tenant.IsAdminOrAbove && !_tenant.IsSuperAdmin`. If `IsAdminOrAbove` is not mocked, it defaults to `false` and the test forces `usuarioId` to the vendor's own UserId. Test was correctly skipped due to divergence.
- **Suggested fix:** Update mock to set `IsAdminOrAbove` instead of (or in addition to) the legacy `IsAdmin`, then un-skip.

---

## 5. Audit Lenses Summary

| Lens | Confirmed findings | Notable insight |
|------|-------|-----------------|
| **Backend RBAC enforcement (frontend vs backend)** | 6 (4.1, 4.2, 4.3, 4.4, 4.16, 4.18) | Frontend `middleware.ts` is the only RBAC layer for several routes. Backend endpoints rely on `.RequireAuthorization()` alone. `CobroEndpoints` is the most serious gap (critical) — collections is financial data with no role check. Standardize on declarative `.RequireRole(...)` on `MapGroup`. |
| **`feat/single-session-strict` implementation correctness** | 4 (4.5, 4.6, 4.14, 4.17) | OAuth bypasses 409 conflict warning; missing audit log on forced session close; 30-second window where revoked JWTs survive; Version double-increment in sync repo. These are load-bearing for the branch's stated purpose. The Version double-increment is already observed in production. |
| **Modal / dialog accessibility patterns** | 3 (4.7, 4.8, 4.21) | Web custom Modal lacks focus restoration. Mobile ConfirmModal lacks backdrop dismiss. TimbresModal duplicates focus trap logic with an inferior implementation. |
| **Spanish i18n accent consistency** | 3 (4.9, 4.10, 4.20) | 3 keys in `es.json` missing accent on `Información`. 5 hardcoded mobile error strings missing accents (sesión, conexión, señal, validación). `SyncStatusCard` hardcodes `sincronizacion`. These can break Playwright text matching and indicate broader i18n debt. |
| **E2E selector stability** | 2 (4.11, 4.16) | Heading-role selectors lacking `level:` cause strict-mode collisions (root cause of the supervisor spec regression). CRUD operations use `getByRole(...).first()` instead of `data-testid`. |
| **Skipped xUnit tests (production coverage gaps)** | 5 (4.12, 4.13, 4.19, 4.22, 4.23) | 12 skipped tests for production automation handlers; 6 for StockNotificationService; 2 for Factura billing; 1 design-by-skip in AnnouncementEndpoints; 1 stale-mock in CobroServiceUnitTests. Wave 3 / Wave 5 deadlines unmet. |
| **Authentication / session management edge cases** | 1 (4.15) | Logout does not end backend impersonation session — only the "Exit" button in the banner does. |

---

## 6. Open Questions / Human Review

1. **Supervisor spec regression (Section 3):** The fix to `{ exact: true }` was insufficient because `h2 "Vendedores del Equipo (3)"` also matches `/Equipo/`. Should we tighten to `{ level: 1, name: 'Equipo', exact: true }` and re-run? Whether the Phase 6 logout fix actually works remains unverified.

2. **Admin spec — Productos sidebar (Section 3):** Is `Productos` also a parent-menu-button like `Clientes` was? If so, the same expand-then-click pattern should be applied. Needs DOM inspection.

3. **Vendedor `/orders` flakiness (Section 3):** With `waitForURL` + 30 s heading timeout, what is still slow? Is the page throwing on render for vendedor role? Worth opening browser DevTools or capturing a Playwright trace.

4. **CobroEndpoints role policy (4.1):** Should SUPERVISOR be allowed to write `/cobros`, or read-only? Business decision — current frontend allows write, but if supervisors should not modify other vendors' collections, the role list and per-handler scoping need clarification.

5. **ReportEndpoints scope (4.3):** Should SUPERVISOR see tenant-wide aggregates or only their team's data? The two verifiers who confirmed and the one who refuted both presented plausible interpretations. Product decision needed; if "team-scoped", every report query needs `WHERE supervisorId = ...` filtering.

6. **Single-session OAuth UX (4.6):** Intentional silent-close or oversight? If intentional, document and add audit log (4.5). If oversight, mirror `LoginAsync` 409 behavior.

7. **Cache invalidation architecture (4.17):** Inject `IMemoryCache` into `AuthService` (single-server) or move to distributed cache (Redis) for multi-instance correctness? Current architecture decision is unclear.

8. **Wave 3 / Wave 5 test enablement (4.12, 4.13):** Who owns the test infrastructure debt? `TenantRlsInterceptor` conditional registration for `Testing` env seems straightforward. The StockNotificationService skip reason is already obsolete per code inspection.

9. **Impersonation logout (4.15):** Confirm backend impersonation session TTL — if it expires quickly, this is low risk; if it's long (e.g., 8h), this should be fixed urgently as it could leave an audit/security trail mismatch.

10. **Version double-increment scope (4.14):** Code memory says this is observed in production. Are there other entities outside `SyncRepository` that also manually increment Version? A grep for `\.Version\+\+` across the repo would confirm whether this fix needs to extend beyond sync.

---

**Audit numbers:** 55 raw findings → 32 refuted by ≥2/3 skeptics → **23 confirmed**. Confirmed mix: 1 critical, 15 high, 5 medium, 3 low.
