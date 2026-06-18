# Opción A — Degradar super admin móvil a Dashboard de Salud de Plataforma

## Decisión
Quitar del MÓVIL la impersonation per-tenant del super admin (token-swap, entrar a un tenant, ver PII de clientes/vendedores). Reemplazar por un **dashboard agregado de salud de plataforma** (cero PII de clientes finales, cero token-swap, cero wipe/re-sync de WDB). El drill-down por empresa (impersonation real con auditoría) **se queda SOLO en WEB** (intacto).

## Estado: los commits de impersonation móvil NO están pusheados
Rama `fix/kpis-vivo-rutas-sync`. Se añaden commits que remueven+reemplazan (sin reescribir historia; `-i` no soportado y sin autorización de rewrite). La Parte A (KPIs en vivo) se conserva.

---

## BACKEND (Mobile API) — quitar impersonation, añadir overview agregado

- [ ] **MobileAdminEndpoints.cs** — reescribir: quitar `/impersonate` + `/stop-impersonation` (token-swap) y los records `MobileImpersonateRequest`/`MobileStopImpersonationRequest`. Reemplazar `/tenants` por `GET /overview` agregado.
  - Shape: `{ success, data: { tenantsActivos, tenantsInactivos, tenantsTotal, pedidosHoy, ventasHoy, ventasMes, tenants: [{id,nombre,plan,activo,usuarios,pedidosHoy}] } }`
  - Guard: `tenant.IsSuperAdmin` (si no, 403).
  - Cross-tenant: `IgnoreQueryFilters()` + `EliminadoEn == null` + `Activo`.
  - TZ "hoy"/"mes": TZ única de plataforma `America/Mexico_City` (defendible para un glance agregado; cada tenant puede diferir pero el agregado usa una sola ancla).
  - SIN PII: nada de nombres de clientes finales / GPS / montos por cliente.
- [ ] **MobileSessionValidationMiddleware.cs** — quitar el bloque `is_impersonating` (L50-100). Las sesiones normales (claim `sid`) no se afectan. Ningún token móvil llevará `is_impersonating` ya.
- [ ] **MobileSyncEndpoints.cs** — quitar `IsImpersonating()` helper + sus 2 usos (anular ClientChanges en `/`, y el 403 READ_ONLY_IMPERSONATION en `/push`).
- [ ] **ServiceRegistrationExtensions.cs** — quitar los 4 registros de impersonation (INotificationRepository, ITenantRepository, IImpersonationRepository, IImpersonationService). VERIFICADO: ningún servicio de notificaciones del Mobile API depende de esos repos (solo usan DbContext) → quitar es seguro.
- [ ] Program.cs — sin cambio (`MapMobileAdminEndpoints` sigue válido; el grupo ahora sirve `/overview`).

## FRONTEND (mobile-app) — quitar impersonation, añadir PlataformaDashboard

- [ ] **src/api/admin.ts** — reemplazar `adminApi` por `getOverview()` + tipos `PlatformOverview`/`OverviewTenant`. Quitar `startImpersonation`/`stopImpersonation`/`ImpersonateResult`.
- [ ] **NEW src/components/admin/PlataformaDashboard.tsx** — header "Plataforma" + KPI cards (Tenants activos/inactivos, Pedidos hoy, Ventas del día) + lista read-only de tenants (sin tap-to-enter, sin ConfirmModal). Pull-to-refresh.
- [ ] **DELETE src/components/admin/EmpresasPicker.tsx**
- [ ] **DELETE src/components/admin/ImpersonationBanner.tsx**
- [ ] **DELETE src/services/impersonation.ts**
- [ ] **src/stores/authStore.ts** — quitar estado `impersonation` + `enterImpersonation` + `exitImpersonation` + sus decls de interface y comentarios Parte B.
- [ ] **app/(tabs)/index.tsx** — SUPER_ADMIN → `<PlataformaDashboard/>`. Quitar branch impersonation + AdminDashboard para super admin.
- [ ] **src/sync/syncEngine.ts** — reemplazar guard de impersonation por guard de super admin: `if (user?.role === 'SUPER_ADMIN') return;` (el super admin no usa WDB offline).
- [ ] **app/(tabs)/_layout.tsx** — super admin: solo `Hoy` + `Más`. `showEquipo = !isVendedor && !isSuperAdmin`; mantener `showVentaCobro = !isSuperAdmin`.
- [ ] **src/components/dashboard/AdminDashboard.tsx** — quitar import/render de ImpersonationBanner + uso de `impersonation`; header paddingTop vuelve a `insets.top + 16`. (AdminDashboard ahora solo lo usa el ADMIN normal.)

## VERIFICACIÓN
- [ ] `dotnet build` Mobile API + `dotnet test` mobile (sin tests de impersonation que ajustar — VERIFICADO: 0 referencias en Mobile.Tests).
- [ ] Rebuild contenedor `api_mobile`; smoke HTTP: login super admin → `GET /api/mobile/admin/overview` 200 con agregados; un ADMIN normal → 403.
- [ ] `cd apps/mobile-app && npm run type-check` (0 errores; sin imports colgados).
- [ ] Smoke emulador: login super admin → ve "Plataforma" (KPIs + lista read-only) → NO hay forma de entrar a un tenant; tabs solo Hoy + Más. Login admin normal → su AdminDashboard intacto (sin banner). Login vendedor → sin cambios.
- [ ] WEB impersonation intacta (no se tocó apps/api ni libs ImpersonationService).

## Review (terminado)
- **Backend**: `dotnet build` exit 0; `dotnet test` Mobile API **739 passed / 0 failed** (el DI container arranca sin los registros de impersonation → confirma que ningún servicio dependía de ellos). Rebuild `api_mobile` OK.
- **Smoke HTTP** (`http://localhost:1052`): super admin `GET /api/mobile/admin/overview` → **200** con agregados correctos (16 tenants: 12 activos/4 inactivos, pedidosHoy=1, ventasHoy=0.09, ventasMes=1808.21; cuadra con el desglose per-tenant; sin PII). Admin normal → **403 Forbidden**.
- **Frontend**: `npm run type-check` exit 0 (sin imports colgados). Grep: 0 referencias residuales a impersonation en todo `mobile-app`.
- **Smoke emulador** (emulator-5554): super admin → pantalla **Plataforma** (KPIs + lista read-only de empresas, **sin chevron de entrar**; tap a empresa NO navega); tab bar **solo Hoy + Más**; Más muestra perfil/navegación. Admin normal → **AdminDashboard intacto** (KPIs, supervisores, **sin banner**) + 5 tabs (Hoy/Equipo/Vender/Cobrar/Más). Vendedor sin tocar (cero cambios en su ruta).
- **Gotcha**: redbox "Unable to resolve EmpresasPicker" fue **cache stale de Metro** (no bug). Se resolvió reiniciando Metro con `--clear` + relanzar Expo Go (cold start). type-check ya estaba limpio.
- **WEB impersonation**: intacta (no se tocó `apps/api` ni `libs`).
- **Pendiente**: commit (hecho tras testing) + decisión de push (requiere OK explícito del usuario).
