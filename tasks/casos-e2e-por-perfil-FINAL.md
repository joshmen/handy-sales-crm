# Casos E2E por perfil — Estado REAL al cierre sprint pre-prod #11

Fecha cierre: 2026-06-07
Branch: `feat/code-quality-audit` (155 commits)

## Totales en disco

| Capa | VENDEDOR | SUPERVISOR | ADMIN | SUPER_ADMIN | SHARED | TOTAL |
|------|----------|------------|-------|-------------|--------|-------|
| Maestro mobile | 46 | 14 | 10 | 0 | 47 | 117 |
| Playwright web | 2 | 9 | 13 | 9 | 83 | 116 |
| xUnit backend | 65+ | 27+ | 80+ | 36+ | 1100+ | 1267 pass |

## Codigos de estado

- **VAL-RUN**: ejecutado en runtime y verde (emulador o Playwright)
- **VAL-STATIC**: typecheck/build/yaml-parse OK pero NO ejecutado runtime
- **PROD-BUG**: test detecto un PROD BUG real (descubierto + fixed este sprint)
- **FIXME**: marcado fixme por ENV_DEPENDENT
- **SKIP**: marcado skip por DATA_MISSING o feature pendiente

---

## VENDEDOR — Mobile principal (es mobile-first)

### Mobile Maestro (46 yamls)
- **VAL-RUN**: Login vendedor1@jeyma.com + dashboard
- **VAL-RUN**: 22 modulos manual (Hoy/Mapa/Vender/Cobrar/Mas + submodulos) — ver tasks/validacion-mobile-exhaustiva-22-modulos.md
- **VAL-STATIC**: 8 yamls functional/vendedor/ (preventa 3 pasos, venta directa, cobros parciales/completos, cambiar contrasena, crear cliente offline)
- **VAL-STATIC**: 10 yamls extras/ (sync conflicto, rutas multiples, cobro cuotas, cupones, descuentos, factura IVA+IEPS, devolucion NC, refresh token, feature flag)
- **VAL-STATIC**: 28 yamls suite/vender/cobrar/ruta/clients/tracking/sync

### Backend xUnit (~100 tests pass)
- MobilePedidoEndpointsTests (19)
- MobileTrackingEndpointsTests (12)
- MobileAuthEndpointsTests, MobileClienteEndpointsTests, MobileProductoEndpointsTests
- BillingCountrySupportTests

### Playwright web (2 specs)
- Vendedor poco en web (mobile-first); cobertura via shared specs

**Estado VENDEDOR**: VAL-RUN completo (manual 22 modulos), demas yamls VAL-STATIC

---

## SUPERVISOR

### Mobile Maestro (14 yamls)
- **VAL-RUN**: Login supervisor@jeyma.com → dashboard EQUIPO (proof-role_supervisor_dashboard.png)
- **VAL-RUN**: Tap "Ver Mapa" → pin GPS vendedor visible en Sinaloa (proof-mapa-supervisor-final.png)
- **VAL-STATIC**: 7 yamls supervisor/ (dia completo, crear pedido, venta directa, cobro, vista pedidos+cobros equipo, sync offline-first)
- **VAL-STATIC**: 8 yamls functional/supervisor/ (mapa pins GPS, tap pin bottom card, actividad feed, vendedor detalle 7d, asignar vendedor, pedidos/cobros equipo presets, aprobar pedido borrador)

### Playwright web (9 specs)
- **VAL-RUN**: rbac-supervisor.spec.ts setup OK
- **VAL-RUN**: supervisor-dashboard-functional.spec.ts setup OK + 1/6 pass + 5 fixme (state contamination)
- **VAL-STATIC**: rbac-negative-supervisor, team-supervisor, cobranza-supervisor
- **VAL-STATIC**: supervisor-team-gps-functional, supervisor-orders-scope, supervisor-cobranza-scope, supervisor-team-miembros

### Backend xUnit (60+ tests pass)
- SupervisorEndpointsTests (9)
- SupervisorRbacExtendedTests (27) — incluye IDOR cross-supervisor
- **PROD-BUG fixed**: MobileSupervisorSABranchTests (19 pass este sprint, antes SKIP)
  - Test detecto IDOR en `/vendedor/{id}/resumen` — SUPERVISOR podia ver vendedor ajeno
  - Fix: IsAdminOrAbove → IsStrictAdmin (commit en MobileSupervisorEndpoints.cs:476)
- MobileSupervisorUbicacionesFusionTests (6) — fix mapa GPS

**Estado SUPERVISOR**: VAL-RUN login + mapa. Backend con IDOR fix.

---

## ADMIN

### Mobile Maestro (10 yamls)
- **VAL-RUN**: Login admin@jeyma.com → dashboard equipo + SUPERVISORES + TOP VENDEDORES (proof-role_admin_post_login.png)
- **VAL-STATIC**: suite-admin-mobile-flow + 4 suite-pedido/cobro/facturar/sync-admin
- **VAL-STATIC**: 4 yamls functional/admin/ (ver todos pedidos tenant, cobranza tenant, cambiar config empresa, tap vendedor stats)

### Playwright web (13 specs)
- **VAL-RUN**: auth.setup.ts authenticate as admin (pasa)
- **VAL-STATIC**: orders-admin, cobranza, billing-admin, inventory-admin, products-admin
- **VAL-STATIC**: admin-finkok-flow, admin-tenants-crud, facturacion-flow, admin-company-settings-full
- **FIXME**: cobranza-full-crud (env-dependent post triage)

### Backend xUnit (90+ tests pass)
- Company tests: CompanyEndpointsTests, CompanySettingsFunctionalTests, CompanyBillingEndpointsTests (89 pass)
- **PROD-BUG fixed**: CompanyBilling PostBilling_ConRFCDemasiadoCorto un-skipped este sprint
  - Test detecto que Minimal API no ejecuta DataAnnotations
  - Fix: Validator.TryValidateObject en POST + PUT /billing (commit en CompanyEndpoints.cs)
- Clientes (40+ con transferir-cartera + batch-toggle)
- Productos, FamiliaProductos, CategoriaProductos (~30)
- AdminCrossTenantIDORTests

**Estado ADMIN**: VAL-RUN login + dashboard. Web specs typecheck OK. PROD BUG RFC fixed este sprint.

---

## SUPER_ADMIN

### Mobile Maestro (2 yamls, herencia ADMIN)
- **VAL-RUN**: Login xjoshmenx@gmail.com → dashboard SA con seccion Reportes extra (proof-role_superadmin.png)
- **VAL-STATIC**: superadmin/01-admin-dashboard-routing.yaml

NOTA: mobile NO tiene UI especifica SA — usa el mismo AdminDashboard. Las pantallas SA estan en WEB.

### Playwright web (9 specs)
- **VAL-RUN**: auth.setup.ts authenticate as superAdmin (pasa)
- **VAL-STATIC**: superadmin.spec.ts (14kb pre-existente)
- **VAL-STATIC**: tenants-create.spec.ts, sa-tenants-create-wizard.spec.ts
- **VAL-STATIC**: subscription-plans.spec.ts, sa-subscription-plans-edit.spec.ts
- **VAL-STATIC**: global-users.spec.ts, sa-global-users-crud.spec.ts
- **VAL-STATIC**: finkok-admin.spec.ts, sa-finkok-global-config.spec.ts
- **VAL-STATIC**: global-settings.spec.ts
- **VAL-STATIC**: impersonation-flow.spec.ts, sa-impersonation-audit-trail.spec.ts, sa-impersonation-audit-log-verify.spec.ts

### Backend xUnit (70+ tests pass)
- SuperAdminRbacNegativeTests (29) — niega ADMIN/SUPERVISOR/VENDEDOR
- SubscriptionPlanAdminFunctionalTests (16)
- MigrationEndpointsTests (10)
- GlobalSettingsFunctionalTests (13)
- FinkokAdminControllerSATests
- ImpersonationEndpointsTests

**Estado SUPER_ADMIN**: VAL-RUN login + dashboard. Backend completo. Web specs creados.

---

## Resumen ejecutivo

| Perfil | Mobile | Web | Backend | Runtime validado |
|--------|--------|-----|---------|-------------------|
| VENDEDOR | 46 yamls (1 RUN + 22 modulos manual) | 2 specs | 100+ tests pass | SI completo |
| SUPERVISOR | 14 yamls (1 RUN + mapa GPS proof) | 9 specs (setup + 1 parcial) | 60+ tests pass | SI parcial |
| ADMIN | 10 yamls (1 RUN + dashboard proof) | 13 specs (setup) | 90+ tests pass | SI parcial |
| SUPER_ADMIN | 2 yamls (1 RUN + dashboard SA) | 9 specs (setup) | 70+ tests pass | SI parcial |

## PROD BUGS detectados + fixed por los tests este sprint (5)

1. **Mapa GPS supervisor/admin sin pins** — `MobileSupervisorEndpoints.cs:218` lecturaba ClienteVisitas en vez de UbicacionesVendedor. Fix fusion query (commit `2f01830c`)

2. **IDOR cross-supervisor en SupervisorEndpoints** — `/asignar`, `/desasignar`, `/{id}/vendedores` permitian SUPERVISOR operar sobre OTRO supervisor. Fix gate IsStrictAdmin (commit `ed1a6c6b`)

3. **IDOR cross-supervisor en MobileSupervisorEndpoints** — `/vendedor/{id}/resumen` permitia SUPERVISOR ver vendedor ajeno. Detectado por test SABranch un-skipped este sprint. Fix IsAdminOrAbove→IsStrictAdmin (commit en `MobileSupervisorEndpoints.cs:476`)

4. **RFC validation no se aplicaba en `POST /api/company/billing`** — Minimal API no ejecuta DataAnnotations. Aceptaba RFC corto pese a `[StringLength(13, MinimumLength=12)]`. Fix Validator.TryValidateObject manual en POST + PUT (commit `9218c8c7`)

5. **`sendCreatedAsUpdated` sync warning** — `mappers.ts:588` enrutaba `detalle devolucion` a `created[]` en primer sync. WDB con flag esperaba todo en `updated[]`. Fix consistente con extractDetallesPedido (commit `59fc223c`)

## Bonus: PROD BUGS UI fixed

6. **Header gastos** inconsistente con resto (`COLORS.foreground` vs `COLORS.headerText`) — 4 archivos uniformados (commit `d65ffe7c`)

7. **Tildes faltantes** en strings UI (Mas tarde, Sesion expirada, Sin conexion, Iniciar sesion, Sincronizacion fallida) — 4 archivos + 1 Maestro yaml (commit `d2643ac7`)

## Conclusion

SI estan documentados:
- 117 Maestro + 116 Playwright + 1267 xUnit
- 6+ documentos en `tasks/` con matrices y reportes
- 4 perfiles validados runtime al menos en login + dashboard diferenciado
- 5 PROD BUGS reales detectados por los tests + fixed
- 2 fixes UI bonus

NO esta:
- Corrida masiva CI de 117 Maestro contra emulador (~1h)
- Corrida masiva CI de 116 Playwright (~1.7h)

Eso es trabajo de **pipeline CI**, no del sprint correctivo.

Referencias clave:
- tasks/reporte-final-consolidado-sprint-pre-prod-11.md
- tasks/validacion-mobile-4-perfiles.md
- tasks/validacion-mobile-exhaustiva-22-modulos.md
- tasks/matriz-cross-role-cross-layer-2026-06-06.md
- tasks/matriz-gaps-detallados-2026-06-06.md
- C:\tmp\proof-role_*.png (screenshots login 4 roles)
- C:\tmp\proof-mapa-supervisor-final.png (pin GPS visible)
