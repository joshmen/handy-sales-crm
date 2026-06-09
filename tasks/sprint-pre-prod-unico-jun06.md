# Sprint único pre-prod — 2026-06-06

> 95 findings → 88 tareas accionables (excluyo rotación manual de keys/secrets en dashboards de vendor; mantengo los cambios de código que los acompañan).
>
> Orden: CRITICAL → HIGH → MEDIUM → LOW. Marcar conforme se cierran.

## CRITICAL (10 tareas)

1. Parametrizar `BillingTenantRlsInterceptor.cs:80` con `set_config('app.tenant_id', @p, false)` + validar regex `^\d+$` en el claim
2. Auditar `apps/api/.../TenantRlsInterceptor.cs` por el mismo patrón de SQL injection y aplicar fix paralelo
3. Eliminar default `Cloudinary__Url` hardcoded en `docker-compose.dev.yml:76` (que falle si no hay env var)
4. Eliminar el secret commiteado en `docs/PLAN_MEJORAS_HANDYSALES.md:140`
5. Agregar `gitleaks` pre-commit hook + workflow `secret-scan.yml` (ejecuta `trufflehog filesystem .`)
6. Cablear `passphrase: await getOrCreateDbEncryptionKey()` en `apps/mobile-app/src/db/database.ts:45`
7. Refactor `apps/mobile-app/app/_layout.tsx` a `await initDatabase()` antes del `Stack` (async init)
8. Migración one-shot `unsafeResetDatabase()` + full sync en primer boot post-update si detecta WDB plaintext
9. Agregar bloque dedup `(TenantId, MobileRecordId)` en `SyncRepository.UpsertVisitaAsync` (copiar de `UpsertPedidoAsync`)
10. Agregar bloque dedup `(TenantId, MobileRecordId)` en `SyncRepository.UpsertCobroAsync`

## HIGH (15 tareas)

11. Renombrar `ICurrentTenant.IsAdmin` → `IsAdminOrAbove`; agregar `IsStrictAdmin => Role is "ADMIN" or "SUPER_ADMIN"`
12. Auditar los 30+ call sites con `!IsAdmin && !IsSuperAdmin` y migrar a `IsStrictAdmin` donde la intención sea estricta (PUT /api/company/settings, upload-logo, aprobar/rechazar prospecto, etc.)
13. Migration `CREATE UNIQUE INDEX CONCURRENTLY` parcial en `mobile_record_id` para Pedidos, DetallesPedido, Clientes, Cobros, Visitas, Gastos, Devoluciones (`WHERE mobile_record_id IS NOT NULL`)
14. Capturar `PostgresException SqlState='23505'` en `SyncRepository.Upsert*Async` y devolver el registro existente (idempotente)
15. Crear helper `EnsureBelongsToTenantAsync<T>(int id, int tenantId)` en `libs/HandySuites.Application/Common/`
16. Aplicar `EnsureBelongsToTenantAsync` en `SyncRepository.cs:463` (Pedido → ClienteId, ProductoId)
17. Aplicar `EnsureBelongsToTenantAsync` en `SyncRepository.cs:671` (Visita → ClienteId)
18. Aplicar `EnsureBelongsToTenantAsync` en `SyncRepository.cs:953` (Cobro → ClienteId, PedidoId)
19. Agregar policy `geo-proxy` (30/min por user) en `MobileGeoProxyEndpoints.cs:9-42` con `.RequireRateLimiting()`
20. Configurar `HttpClient.Timeout = TimeSpan.FromSeconds(5)` en el `GeoProxyClient`
21. Response cache de 24h para Google Places Details `placeId`
22. Crear namespace `settings.security.twoFactor.{...}` en `es.json`/`en.json` + hookear `useTranslations` en `TwoFactorSetup.tsx` (8 toasts, botones, warning recovery)
23. Eliminar ruta `apps/web/src/app/(dashboard)/promotions/create/page.tsx` (drawer en /promotions es canónico)
24. Reemplazar `+52 555 123 4567` y `ventas@handysuites.com` hardcoded en `subscription/expired/page.tsx:199-215` con valores de `globalSettings.contactInfo`
25. Migration `HasIndex(rt => rt.Token).IsUnique()` en `RefreshToken` + `CREATE UNIQUE INDEX CONCURRENTLY`

## HIGH — tests (4 tareas)

26. Sync `.env.production.template:31` a `Jwt__Secret`, `Jwt__Issuer`, `Jwt__Audience`, `Jwt__ExpirationMinutes`
27. Migrar `CustomWebApplicationFactory.cs:83-89` de SQLite a Testcontainers PostgreSQL (`pgvector/pgvector:pg17`)
28. Eliminar `InternalServerError` del whitelist en `CobroEndpointsTests.cs:81,90` tras migrar a PG
29. Crear `PedidoServiceTests.cs` con fixtures seeded en Testcontainers PG (eliminar el silent no-op `if BadRequest return`)

## MEDIUM — UI/UX consistency (8 tareas)

30. `admin/announcements/page.tsx:705` CTA `bg-purple-600` → `bg-success text-success-foreground hover:bg-success/90`
31. `billing/settings/page.tsx:256-260` banner `bg-blue-50/border-blue-200` → `bg-info/10 border-info/30` + traducir cross-link hint
32. `admin/finkok/page.tsx:271` spinner `w-3.5 h-3.5` → `w-4 h-4`
33. `admin/crash-reports/page.tsx:303-323` warning `border-amber-200` → `border-amber-300 dark:border-amber-700` + botón `bg-blue-600` → `bg-success`
34. `clients/transferir-cartera/page.tsx:94-97` emoji ⚠️ → `<AlertTriangle>` icon + `border-amber-300/700` + i18n del warning
35. `subscription/expired/page.tsx` CTA card "Mas Popular" → `bg-success` (no blue)
36. `admin/cupones/page.tsx:435,528` secondary buttons `bg-blue-600` → `bg-success`
37. Mover `apps/web/src/app/test-toast/page.tsx` a `(dashboard)/_dev/` con guard de role o eliminarlo del bundle prod

## MEDIUM — i18n completo (8 tareas)

38. Crear namespace `settings.security.twoFactorDisable.{...}` + hookear `useTranslations` en `TwoFactorDisable.tsx`
39. Crear namespace `admin.finkok.{...}` + hookear i18n en `admin/finkok/page.tsx` (breadcrumb, title, subtitle, headers tabla, botones, toasts)
40. Crear namespace `clients.transferCartera.{...}` + i18n en `transferir-cartera/page.tsx` (warning, labels, placeholders)
41. Cablear `useTranslations('admin.crashReports')` en `admin/crash-reports/page.tsx` (~20 strings — keys ya existen en en.json)
42. i18n en orders filters (`Desde`/`Hasta` placeholders, etc.)
43. i18n en `ZoneFilters.tsx` Select placeholders
44. i18n en `DiscountFilters.tsx` Select placeholders
45. Mover catálogo SAT (19 régimenes con em-dash) a `lib/sat/regimenes-fiscales.ts` y reemplazar `—` por `:` o ` - ` en labels

## MEDIUM — features incompletas (3 tareas)

46. Eliminar ruta `apps/web/src/app/(dashboard)/discounts/create/page.tsx` (stub sin api.post + mockProducts con marcas reales)
47. `billing/suspended/page.tsx` — integrar Stripe Checkout real (eliminar `setTimeout` fake en `handleReactivate`) o redirigir a `/subscription`
48. Crear `billing/payment-methods/page.tsx` o redirigir el botón a `/subscription`

## MEDIUM — accesibilidad (12 tareas)

49. `apps/web/src/app/layout.tsx:124` — agregar `id="main-content" tabIndex={-1}` en `<main>` (skip link)
50. Refactor `components/ui/DataGrid.tsx` a `<table>` semántica con `role=grid/row/cell`
51. `DataGrid.tsx:141` sortable headers `<div onClick>` → `<button>` + `aria-sort`
52. `DataGrid.tsx:131,199` checkboxes de selección → agregar `aria-label` descriptivo
53. `components/ui/Input.tsx:26` agregar `aria-invalid={!!error}` + `aria-describedby` apuntando al error message
54. `ClientFormComponents.tsx:12` checkbox custom (sin `<input>`) → reemplazar por Radix Checkbox
55. `ClientFormComponents.tsx:55` FormField label sin `htmlFor` → prop `id` + `htmlFor`
56. `components/ui/ErrorBanner.tsx` → agregar `role="alert" aria-live="assertive"`
57. `components/layout/Header.tsx` icon-buttons → agregar `aria-label`
58. `components/ui/Drawer.tsx` — portar `useEffect` de focus trap desde `Modal.tsx`
59. `components/ui/ActiveToggle.tsx` → agregar `role="switch" aria-checked={isActive}`
60. `components/ui/SearchableSelect.tsx` — keyboard nav (ArrowKeys + aria-activedescendant)

## MEDIUM — backend hardening (10 tareas)

61. `Sidebar.tsx` → agregar `aria-label` cuando `!showLabels`
62. Mobile bare `catch {}` en `registrar.tsx`, `revision.tsx`, `recibo.tsx` etc. → `crashReporter.reportCrash(err, {component, operation})`
63. Guard universal en `apps/mobile-app/src/constants.ts:9` — `if (!__DEV__ && url.startsWith('http://')) throw new Error('HTTPS requerido en prod')`
64. `DashboardEndpoints.cs:119` eliminar catch silenciado + log vía Serilog
65. `UsuarioEndpoints.cs` (11 handlers) eliminar `catch (Exception)` genérico O agregar `logger.LogError(ex, ...)`
66. `MobileMetasEndpoints.cs:48` N+1 → single query con `GroupBy(m => m.Tipo)` + slice en memoria
67. `ReportEndpoints.cs:131-722` push GroupBy a SQL (eliminar `.ToListAsync()` antes del GroupBy)
68. `TeamLocationEndpoints.cs:76` agregar filtro `> UtcNow.AddDays(-1)` (full table scan actual)
69. `ImportExportEndpoints.cs:28` `INNER JOIN` → `GroupJoin + DefaultIfEmpty` (no perder clientes sin pedidos)
70. `SupervisorEndpoints.cs:69` `{id}/vendedores` — usar `IsStrictAdmin` + filter por `currentUser.UserId` cuando rol=SUPERVISOR

## MEDIUM — security/infra (11 tareas)

71. `TeamLocationEndpoints.cs:43` — supervisor solo ve `u.SupervisorId == currentUser.UserId`
72. `apps/billing/Program.cs:149` agregar Polly circuit breaker + `Timeout = 30s` + dead-letter queue para Finkok
73. `MobileAttachmentEndpoints.cs:60` validar magic bytes con `ImageUploadHelpers.ValidateImageMagicBytes(stream)`
74. `apps/mobile/Program.cs` configurar `Kestrel.Limits.MaxRequestBodySize = 5_242_880` (5MB) + documentar chunking en sync
75. `docker-compose.dev.yml` — prefijar todos los `ports:` con `127.0.0.1:` (no exponer a LAN en dev)
76. `infra/docker/Dockerfile.Billing.Prod:50` — `ASPNETCORE_URLS` build-time → shell-form CMD con `${PORT}` runtime
77. `Usuario.cs:14` agregar `HasIndex(u => u.Email).IsUnique()` + migration
78. Index parcial `mobile_record_id` en Pedidos/DetallesPedido/Clientes/Cobros (`WHERE NOT NULL`) — combina con #13
79. Composite index `(tenant_id, producto_id, creado_en)` en `MovimientosInventario`
80. `AuthService.cs:342` agregar `FailedLoginAttempts` + `LockedUntil` columnas en `Usuario`; lockout 15 min tras 5 fallos
81. `UsuarioRegisterDtoValidator.cs:16` — `MinimumLength(12)` + regex de complejidad (mix mayús/minus/dígitos/símbolos)

## MEDIUM — perf (3 tareas)

82. `apps/billing/Program.cs:43` CORS — gate localhost por `IsDevelopment()`
83. `reports/page.tsx:23` — `const X = dynamic(() => import('./X'))` para los 16 report components + lazy import de `jspdf`
84. `ReportEndpoints.cs:55-722` — re-escribir queries para EF `GroupBy` traducible a SQL (verificar con Npgsql logger)

## LOW (11 tareas)

85. `orders/[id]/page.tsx` + `clients/[id]/page.tsx` + `billing/invoices/[id]/page.tsx` — migrar a `<PageHeader>` + reemplazar `bg-[#F9FAFB]` con `bg-background`/`bg-muted` (rompe dark mode)
86. Tenant detail labels (`ID Fiscal`, `Razón Social`, `Contacto`) — mover a i18n
87. `clients/[id]` tabs → agregar `role=tablist/tab/aria-selected`
88. `SearchableSelect.tsx` clear button — el `<span role="button">` dentro de `<button>` es HTML inválido → extraer a sibling button
89. Modal — restaurar foco al elemento previo cuando se cierra (`previouslyFocusedElement.focus()` en cleanup)
90. Limpiar dead code `failedQueue` + `processQueue` en interceptor 401 (`apps/web/src/lib/api.ts`)
91. `SyncRepository.GenerarNumeroPedidoAsync` — usar `Select(p => p.Numero)` projection en vez de cargar entity completa
92. Internal `/tenants/{id}/admin-emails` — validar que el tenant existe antes de query
93. `MonitoringEndpoints.cs` — log el catch vacío vía Serilog (enmascara outages downstream)
94. `PushNotificationService` — filtrar por `tenant_id` antes de insertar en `NotificationHistory` (cross-tenant pollution)
95. `.github/workflows/deploy-apis.yml` — agregar `concurrency: { group: deploy-${{ github.ref }}, cancel-in-progress: false }`

---

## Notas de ejecución

- Cada tarea = un commit atómico con mensaje descriptivo
- Ejecutar tests relevantes ANTES de cada commit (dotnet test / playwright / type-check según área)
- Reportar bloqueadores inmediatamente — no encadenar fixes que comparten estado
- Branch destino: `feat/code-quality-audit` (continuar desde `0df06773`)
- Push final: solo cuando todo el sprint esté verde y validado
