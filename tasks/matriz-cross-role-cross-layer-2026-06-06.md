# Matriz cross-role × cross-layer validacion 2026-06-06

## Resumen ejecutivo

**Inventario total:**
- **Backend endpoints**: 170 (Main API ~140, Billing API ~20, Mobile API 25)
- **Frontend screens**: ~80 paginas web (dashboard + admin + billing)
- **Mobile screens**: 38 React Native screens
- **Specs Playwright existentes**: ~25 archivos (auth, superadmin, visual-audit, drawer-tour, etc.)
- **Maestro flows existentes**: ~15 (auth + sync + supervisor + tracking)
- **xUnit tests**: 429 (391 Main API + 38 Mobile API)

**Cobertura aproximada por celda (% endpoints/screens con al menos 1 test funcional):**

| Capa | SA | ADMIN | SUPERVISOR | VENDEDOR |
|------|----|----|----|----|
| Backend | ~25% / 18 HIGH gaps | ~40% / 14 HIGH gaps | ~35% / 8 HIGH gaps | ~55% / 4 HIGH gaps |
| Frontend | ~30% / 12 HIGH gaps | ~25% / 14 HIGH gaps | ~10% / 7 HIGH gaps | N/A (mobile-only) |
| Mobile | ~10% / 8 HIGH gaps | ~15% / 6 HIGH gaps | ~40% / 3 HIGH gaps | ~70% / 2 HIGH gaps |

**HIGH gaps que bloquean pre-prod (71 totales):**
- Cross-tenant leak en ADMIN scope: sin negative tests, riesgo de fuga entre tenants en cualquier hot path (clientes, pedidos, cobros)
- SUPER_ADMIN endpoints sensibles (MigrationEndpoints, GlobalSettings, FinkokAdminController) sin cobertura de guard
- Billing CFDI/timbrado SAT sin E2E ADMIN (riesgo regulatorio fiscal MX)
- Mobile sync (WatermelonDB push/pull) sin xUnit ni Maestro para ADMIN (hot path offline-first)
- Branch activo `feat/finkok-registration-emisores` modifica FinkokAdminController sin tests del controller (solo del service)

---

## Matriz 4x3 (4 roles × 3 layers)

| Capa | SA | ADMIN | SUPERVISOR | VENDEDOR |
|------|----|----|----|----|
| **Backend** | ~25% / 18 HIGH | ~40% / 14 HIGH | ~35% / 8 HIGH | ~55% / 4 HIGH |
| Key gaps | SubscriptionPlanAdminEndpoints, GlobalSettings, MigrationEndpoints, FinkokAdmin, /api/companies cross-tenant | /clientes/transferir-cartera, /clientes/batch-toggle, company billing CFDI, cross-tenant filter | aprobar/rechazar prospecto, transferir cartera (read), saldos resumen | login/refresh, pedidos CRUD, cobros propios |
| **Frontend** | ~30% / 12 HIGH | ~25% / 14 HIGH | ~10% / 7 HIGH | N/A |
| Key gaps | /admin/finkok, /admin/global-users, /admin/subscription-plans, /admin/tenants CREATE flow | orders create, cobranza CRUD, billing/invoices/new (CFDI), products CRUD, inventory | dashboard supervisor, aprobar prospectos UI, mis-vendedores list, KPIs equipo | N/A (mobile-only) |
| **Mobile** | ~10% / 8 HIGH | ~15% / 6 HIGH | ~40% / 3 HIGH | ~70% / 2 HIGH |
| Key gaps | MobileLogLevelEndpoints, AdminDashboard SA routing, /resumen-tenant, /mis-vendedores admin branch, login SA | MobileSyncEndpoints push/pull, MobilePedidoEndpoints admin, AdminDashboard role-routing | supervisor crear pedido (cover existe pero parcial), aprobar prospecto mobile | sync (covered), pedido CRUD (covered) |

---

## Top 30 HIGH gaps priorizados

| # | Rol | Capa | Modulo | Descripcion | Suggested test |
|---|-----|------|--------|-------------|----------------|
| 1 | SA | Backend | MigrationEndpoints | RequireRole SUPER_ADMIN ejecuta migrations runtime; cero coverage | xUnit MigrationEndpointsTests: SA happy + ADMIN 403 |
| 2 | SA | Backend | GlobalSettingsEndpoints | PUT modifica config global plataforma; guard IsSuperAdmin in-code sin test | xUnit positive SA + negative ADMIN/SUPERVISOR 403 |
| 3 | SA | Backend | SubscriptionPlanAdminEndpoints | CRUD planes SaaS hot path billing | xUnit SubscriptionPlanAdminEndpointsTests positive+negative RBAC |
| 4 | SA | Backend | FinkokAdminController | 7+ endpoints (suspender, reactivar, creditos) guard IsSuperAdmin sin test | xUnit FinkokAdminControllerTests: cada endpoint con SA+ADMIN+VENDEDOR |
| 5 | SA | Backend | CompanyEndpoints cross-tenant | GET/POST/DELETE /api/companies SA-only sin test | xUnit CompanyEndpointsTests: SA list/create/delete + ADMIN 403 |
| 6 | ADMIN | Backend | /clientes/transferir-cartera | Transfiere cartera entre vendedores; sin test | xUnit ClienteTransferirCarteraTests: ADMIN ok + SUPERVISOR 403 + cross-tenant 404 |
| 7 | ADMIN | Backend | /clientes/batch-toggle | Activar/desactivar masivo; sin assertion | xUnit ClienteBatchToggleTests: ADMIN ok + VENDEDOR 403 |
| 8 | ADMIN | Backend | /api/company/billing | POST/PUT datos fiscales SAT (CSD, RFC) sin test | xUnit CompanyBillingTests: ADMIN POST/PUT ok, DELETE 403 (SA-only) |
| 9 | ADMIN | Backend | Cross-tenant filter (global) | Query filter TenantId enforcement sin test cross-tenant | xUnit CrossTenantIsolationTests: ADMIN tenant A vs lookup tenant B en clientes/pedidos/cobros |
| 10 | ADMIN | Backend | /api/companies/{id} tenant-scope | ADMIN solo own tenant; negative case sin verificar | xUnit TenantScopeTests: ADMIN tenant A → tenant B → 403/404 |
| 11 | ADMIN | Backend | FinkokAdminController write | Branch feat/finkok-registration-emisores sin controller tests (solo service) | xUnit FinkokAdminControllerWriteTests: ADMIN registro emisor + RFC validation |
| 12 | SA | Frontend | /admin/finkok | Pagina admin Finkok sin spec; branch activo | Playwright finkok-admin.spec.ts: SA login, lista emisores, registro nuevo, ADMIN 403 |
| 13 | SA | Frontend | /admin/global-users | Cross-tenant users sin spec | Playwright global-users.spec.ts: list/filter/suspend + RBAC |
| 14 | SA | Frontend | /admin/subscription-plans | CRUD planes (incluye_tracking_vendedor) sin spec | Playwright subscription-plans.spec.ts: create/edit/toggle feature |
| 15 | SA | Frontend | /admin/tenants CREATE | superadmin.spec.ts solo valida boton; flujo completo sin cubrir | Playwright tenant-create.spec.ts: abrir wizard, llenar form, submit, verificar lista |
| 16 | ADMIN | Frontend | orders/create-order | orders.spec.ts entero en .skip; hot path CRUD | Playwright orders-admin.spec.ts: crear pedido completo (cliente, productos, totales) |
| 17 | ADMIN | Frontend | cobranza/cobros | Modulo financiero critico sin spec dedicado | Playwright cobranza.spec.ts: registrar pago, ver saldos, estado-cuenta cliente |
| 18 | ADMIN | Frontend | billing/invoices/new (CFDI) | Timbrado SAT sin spec; riesgo regulatorio fiscal MX | Playwright billing-timbrado.spec.ts: pre-factura → timbrar → descargar XML/PDF |
| 19 | ADMIN | Frontend | products CRUD | products/units/taxes/categories sin spec funcional | Playwright products-crud.spec.ts: crear producto + unidad + impuesto + categoria |
| 20 | ADMIN | Frontend | inventory | Ajustes inventario auditables sin spec | Playwright inventory.spec.ts: crear ajuste, ver historial, validar saldo |
| 21 | SA | Mobile | MobileLogLevelEndpoints | Hand-rolled string compare 'SUPER_ADMIN' (casing brittle) sin test | xUnit MobileLogLevelEndpointsTests: SA GET/POST + casing variants |
| 22 | SA | Mobile | Login SA mobile | Ningun Maestro flow prueba login SA (xjoshmenx unico SA) | Maestro auth/02-login-superadmin.yaml |
| 23 | SA | Mobile | AdminDashboard role-routing | if role === 'ADMIN' \|\| 'SUPER_ADMIN' sin guard test | xUnit RoleRoutingTests + Maestro flow verifica dashboard correcto |
| 24 | SA | Mobile | /resumen-tenant | KPI tenant-wide depende de CompanySettings.Timezone (UTC fallback risk) | xUnit ResumenTenantTests: SA con/sin CompanySettings, timezone correcto |
| 25 | SA | Mobile | /mis-vendedores admin branch | Predicate u.Id != supervisorId sin test (SA podria verse a si mismo) | xUnit MisVendedoresAdminBranchTests: SA no aparece, otros admins excluidos |
| 26 | SA | Mobile | /pedidos & /cobros tenant-wide | Cross-tenant leak risk si filter regresa | xUnit MobileSupervisorTenantWideTests: SA ve pedidos tenant, no cross-tenant |
| 27 | ADMIN | Mobile | MobileSyncEndpoints push/pull | Hot path offline-first sin xUnit ni Maestro ADMIN | xUnit MobileSyncEndpointsAdminTests + Maestro sync/03-sync-admin.yaml |
| 28 | ADMIN | Mobile | MobilePedidoEndpoints admin | Solo cubierto con Vendedor; ADMIN scope completo sin test | xUnit MobilePedidoEndpointsAdminTests: crear/enviar/confirmar/entregar como ADMIN |
| 29 | ADMIN | Backend | /api/Catalogos/configuracion-fiscal | Write ADMIN-only sin negative SUPERVISOR/VENDEDOR | xUnit CatalogosConfiguracionFiscalTests: ADMIN POST ok, SUPERVISOR 403 |
| 30 | SA | Frontend | superadmin.spec.ts ampliacion | Solo SA-1 (boton) cubierto; resto admin SA sin specs | Playwright superadmin-extended.spec.ts: cupones, tickets soporte, observabilidad |

---

## Plan ejecutable

### 1. Tests xUnit nuevos (Backend) — 22 archivos prioritarios

**SA (8 archivos):**
- MigrationEndpointsTests, GlobalSettingsEndpointsTests, SubscriptionPlanAdminEndpointsTests
- FinkokAdminControllerTests (Billing), CompanyEndpointsCrossTenantTests
- MobileLogLevelEndpointsTests, ResumenTenantSATests, MisVendedoresAdminBranchTests

**ADMIN (10 archivos):**
- ClienteTransferirCarteraTests, ClienteBatchToggleTests, CompanyBillingTests
- CrossTenantIsolationTests (clientes + pedidos + cobros — el mas critico)
- TenantScopeTests, FinkokAdminControllerWriteTests, CatalogosConfiguracionFiscalTests
- MobileSyncEndpointsAdminTests, MobilePedidoEndpointsAdminTests, CompanySettingsAdminTests

**SUPERVISOR (4 archivos):**
- AprobarRechazarProspectoTests (positive supervisor + negative vendedor)
- SaldosResumenSupervisorTests, MisVendedoresSupervisorBranchTests, MobileSupervisorPedidoTests

### 2. Playwright specs nuevos (Frontend) — 12 specs, focus SA + Supervisor + ADMIN CFDI

**SA (4):** finkok-admin.spec.ts, global-users.spec.ts, subscription-plans.spec.ts, tenant-create.spec.ts
**ADMIN (5):** orders-admin.spec.ts, cobranza.spec.ts, billing-timbrado.spec.ts, products-crud.spec.ts, inventory.spec.ts
**SUPERVISOR (3):** supervisor-dashboard.spec.ts, supervisor-aprobar-prospecto.spec.ts, supervisor-kpis-equipo.spec.ts

Reusar pattern `loginAsSuperAdmin` / `loginAsAdmin` con `clearAuthStorage` (per MEMORY.md — stale localStorage causa 401 cascade). SA specs en `mode: 'serial'` (xjoshmenx unico SA).

### 3. Maestro flows nuevos (Mobile) — 5 flows priorizados

1. `auth/02-login-superadmin.yaml` — primer flow SA mobile (no existe)
2. `auth/03-login-admin-no-jeyma.yaml` — ADMIN distinto de admin@jeyma.com
3. `admin/01-dashboard-tenant-kpis.yaml` — verifica resumen-tenant SA/ADMIN
4. `admin/02-mis-vendedores-list.yaml` — branch admin de /mis-vendedores
5. `sync/03-sync-admin-push-pull.yaml` — sync WatermelonDB con ADMIN

Pre-requisito: verificar que login SA mobile no este bloqueado por roles hardcoded en cliente RN (revisar `app/(tabs)/index.tsx` antes de invertir en Maestro).

### 4. RBAC negative tests por endpoint critico

Crear helper xUnit `RbacNegativeAssertions` que dado un endpoint + rol esperado:
- Llama con cada rol no autorizado (SUPER_ADMIN/ADMIN/SUPERVISOR/VENDEDOR menos el esperado)
- Asserta 403 Forbidden o 401 Unauthorized
- Asserta NO data leak en body

Aplicar a los 30 endpoints HIGH del top — esto solo agrega ~30 archivos pero cubre la dimension cross-role que falta sistematicamente.

---

## Riesgos identificados

1. **Cross-tenant leak (ADMIN)**: filtro global `TenantId == CurrentTenantId` es el unico guard en hot paths (clientes, pedidos, cobros). Un solo `IgnoreQueryFilters()` mal puesto expone datos cross-tenant. Sin tests cross-tenant explicitos.

2. **SUPER_ADMIN guards in-code (no atributo)**: FinkokAdminController, GlobalSettings, CompanySettings usan `if (!IsSuperAdmin()) return Forbid()` en cada metodo. Patron fragil — un metodo nuevo sin la linea queda sin guard. Falta lint/analyzer + test sistematico.

3. **Branch feat/finkok-registration-emisores en hot path billing**: modifica controller SA-only sin tests del controller. Si llega a prod por error (MEMORY.md confirma que Railway prod en algun momento estuvo apuntando a esta branch), no hay safety net.

4. **CFDI timbrado SAT sin E2E**: el feature de mayor riesgo regulatorio (compliance fiscal MX) no tiene Playwright que cubra el flujo pre-factura → timbrar → descargar XML. Una regresion silenciosa puede emitir CFDIs invalidos.

5. **Mobile sync (WatermelonDB) sin xUnit**: hot path offline-first; conflict resolution y last-pulled-at sin test xUnit. Maestro solo cubre vendedor.

6. **Login SA mobile no probado**: ningun Maestro flow exercise el claim `role=SUPER_ADMIN` en device. AdminDashboard SA-routing puede fallar silenciosamente en prod sin que CI detecte.

7. **Casing brittleness en role string compares**: MobileLogLevelEndpoints usa comparacion exacta string `'SUPER_ADMIN'`. Refactor a `RoleNames.SuperAdmin` constant pendiente — sin test, una regresion lockea SA.

8. **xjoshmenx unico SA**: imposibilita tests SA en paralelo (single-session). Toda spec SA debe `mode: 'serial'` — riesgo de slowness en CI si crece la suite SA mucho.
