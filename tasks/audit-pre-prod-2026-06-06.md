# Auditoria Pre-Produccion HandySales — 2026-06-06 (post Bug sweep)

> Workflow `wbt7ynzl0` — 559 agentes, 16 lentes de descubrimiento paralelas + verificación adversarial 2-lentes (correctness + priority pre-prod).
>
> Discovery: 271 findings brutos. Deduped a 271 únicos. Verificados como REALES tras 2 lentes adversariales: **95**.

## TL;DR
- **CRITICAL: 6** | **HIGH: 12** | **MEDIUM: 51** | **LOW: 26** | Total: 95 findings verificados
- **Top 3 bloqueadores pre-prod**:
  1. **SQL injection en BillingTenantRlsInterceptor** — claim JWT concatenado directo a `SET app.tenant_id` ejecutado antes de CADA query EF. Bypassa RLS multi-tenant, expone CSDs y XMLs CFDI cross-tenant.
  2. **Credenciales Cloudinary reales hardcoded en docker-compose.dev.yml + docs** — `cloudinary://899432929937183:Pxxn5PaFCujbBMJ7ut38v4f2g78@dq0o1nbyh` committed a git. Write access total a assets de todos los tenants.
  3. **SQLCipher no cableado en mobile** — clave AES-256 generada en Keystore pero `passphrase` comentado en SQLiteAdapter. Datos PII (RFC, telefono, direccion, pedidos, GPS) plaintext en device. Bloqueador LFPDPPP para MOB-7 Store Release.
- **Recomendacion: NO-GO**. 6 bloqueadores con riesgo legal/financiero/seguridad concreto. Estimado fix: 3-5 dias para CRITICAL + 5-7 dias para HIGH de mayor impacto (RLS audit, idempotencia sync, rate limits).

---

## Bloqueadores CRITICAL (6)

### 1. SQL injection en BillingTenantRlsInterceptor
**`apps/billing/HandySuites.Billing.Api/Services/BillingTenantRlsInterceptor.cs:80`**
Claim JWT `tenant_id` concatenado directo a `SET app.tenant_id = '{tenantId}'` ejecutado antes de cada query EF. Payload `'; SET app.is_super_admin = 'true'; --` bypassa RLS y da acceso cross-tenant a CSDs, XMLs CFDI, facturas.
**Fix**: parametrizar con `set_config('app.tenant_id', @p, false)` + validar regex `^\d+$` en el claim. Auditar `TenantRlsInterceptor` en `apps/api` por mismo patron.

### 2. Credenciales Cloudinary reales committed a git
**`docker-compose.dev.yml:76` + `docs/PLAN_MEJORAS_HANDYSALES.md:140`**
Dos pares api_key:api_secret reales en formato `cloudinary://APIKEY:APISECRET@dq0o1nbyh` commiteados al repo. Cualquier checkout autentica contra la cuenta real.
**Fix**: (1) rotar AMBOS secrets en Cloudinary dashboard, (2) eliminar defaults (`Cloudinary__Url: "${CLOUDINARY_URL}"` sin fallback), (3) gitleaks/trufflehog pre-commit, (4) considerar `git-filter-repo` para historial.

### 3. SQLCipher WDB encryption sin cablear
**`apps/mobile-app/src/db/database.ts:45`**
`dbEncryptionKey.ts` genera clave AES-256 en Keystore/Keychain pero `passphrase` esta literalmente comentado en SQLiteAdapter. Clientes/RFC/telefono/direccion, pedidos con precios, cobros, GPS, fotos plaintext en disco. `adb pull` en device perdido/robado expone PII completa. Bloqueador LFPDPPP MX.
**Fix**: (1) refactor `_layout.tsx` a `await initDatabase()` antes del Stack, (2) `passphrase: await getOrCreateDbEncryptionKey()` en SQLiteAdapter, (3) migracion one-shot plaintext→encrypted en primer launch post-update, (4) documentar perdida de cambios offline pendientes.

### 4. Sync Visita/Cobro sin dedup por MobileRecordId
**`libs/HandySuites.Infrastructure/Repositories/Sync/SyncRepository.cs:664-688, 947-965`**
Cliente/Pedido/Gasto/Devolucion SI dedup por `(TenantId, MobileRecordId)` antes de `Add`; **Visita y Cobro NO**. Retry del sync queue (timeout despues del INSERT, antes del response) crea 2 cobros con mismo `LocalId` → doble decremento de saldo del cliente. Sin indice UNIQUE en DB tampoco.
**Fix**: copiar bloque idempotente de `UpsertPedidoAsync` a `UpsertVisitaAsync` y `UpsertCobroAsync`. Combinar con UNIQUE index parcial.

### 5. Cloudinary API secret real como default en compose (duplicado de #2)
**`docker-compose.dev.yml:76`** — mitigado por fix conjunto con #2.

### 6. Credenciales committed historico (duplicado de #2)
Mismo origen, fix unificado.

---

## HIGH priority (12)

### 1. `ICurrentTenant.IsAdmin` incluye SUPERVISOR — escalamiento silencioso
**`libs/HandySuites.Infrastructure/Repositories/Multitenancy/CurrentTenant.cs:68`**
`Role is "ADMIN" or "SUPER_ADMIN" or "SUPERVISOR"`. 30+ endpoints con `!IsAdmin && !IsSuperAdmin` dejan pasar SUPERVISOR contradiciendo sus comentarios ("Solo ADMIN y SUPER_ADMIN"). Afecta `PUT /api/company/settings`, upload-logo, aprobar/rechazar prospecto, etc.
**Fix**: renombrar a `IsAdminOrAbove` + agregar `IsStrictAdmin => Role is "ADMIN" or "SUPER_ADMIN"`. Auditar todos los call sites.

### 2. MobileRecordId sin UNIQUE index — TOCTOU race
**`HandySalesDbContext.cs:798,844` + `SyncRepository.cs:234-243,402-411`**
`FirstOrDefaultAsync` → `Add` sin lock; 2 requests concurrentes con mismo LocalId ambas insertan. UpsertPedido decrementa inventario en `VentaDirecta+Entregado` → doble salida de stock.
**Fix**: `.IsUnique()` con filter `WHERE MobileRecordId IS NOT NULL`. Migration con dedup + `CREATE UNIQUE INDEX CONCURRENTLY`. Capturar `PostgresException SqlState='23505'`.

### 3. Sync IDOR via ClienteId/ProductoId/PedidoId
**`SyncRepository.cs:463,671,681,953`**
Pedido/Visita/Cobro asignan IDs directo del DTO sin verificar pertenencia al tenant. FKs single-column, Postgres acepta cross-tenant. Vendedor crea Pedido referenciando Cliente de otro tenant → CFDI timbrado al RFC equivocado (cuando BILL-1 PAC real este activo).
**Fix**: helper `EnsureBelongsToTenantAsync<T>(int id, int tenantId)` antes de cada `Add`.

### 4. GeoProxy sin rate limit — Google Maps key abusable
**`apps/mobile/HandySuites.Mobile.Api/Endpoints/MobileGeoProxyEndpoints.cs:9-42`**
3 endpoints sin `.RequireRateLimiting()`, sin `HttpClient.Timeout`. Google Places Details ~$17/1000 → cualquier vendedor autenticado drena la cuota en horas. Sin timeout, outage de Google colapsa thread-pool.
**Fix**: policy `geo-proxy` (30/min por user), `Timeout = 5s`, response cache para placeId.

### 5. TwoFactorSetup 100% hardcoded sin i18n
**`apps/web/src/components/settings/TwoFactorSetup.tsx`**
Dialog de configuracion 2FA (qr/verify/recovery) sin `useTranslations`. 8 toasts, todos los botones, warning de recovery codes hardcoded. Usuarios anglo no pueden completar setup ni entender el warning (perder recovery codes = lockout).
**Fix**: namespace `settings.security.twoFactor` con keys completas + hookear `useTranslations`.

### 6. /promotions/create stub sin API call
**`apps/web/src/app/(dashboard)/promotions/create/page.tsx:80-111`**
`handleSubmit` valida Zod y hace `router.push('/promotions')` sin llamar al backend. Comentario `// await api.post('/promociones', data)` lo confirma. Trampa silenciosa de perdida de datos.
**Fix**: eliminar la ruta (drawer en /promotions es el flujo canonico).

### 7. /subscription/expired con telefono placeholder
**`apps/web/src/app/(dashboard)/subscription/expired/page.tsx:199-215`**
`+52 555 123 4567` (placeholder obvio) y `ventas@handysuites.com` hardcoded en la pagina de mayor presion comercial. Cliente intentando renovar marca numero falso.
**Fix**: mover a `globalSettings` / `tenant.contactInfo`.

### 8. RefreshTokens.Token sin indice — seq scan en cada refresh
**`libs/HandySuites.Domain/Entities/RefreshToken.cs:11`**
Hot path `WHERE Token = $1` sin indice. Mobile rota cada ~15min, tabla crece monotonicamente (revocados no purgados).
**Fix**: `HasIndex(rt => rt.Token).IsUnique()` + migration con `CREATE UNIQUE INDEX CONCURRENTLY`.

### 9. JWT env var naming mismatch en template
**`.env.production.template:31`**
Template usa `JWT__SecretKey` pero codigo lee `Jwt:Secret`. Operador siguiendo template literal → `Secret=""` → crash boot.
**Fix**: sync template a `Jwt__Secret`, `Jwt__Issuer`, `Jwt__Audience`, `Jwt__ExpirationMinutes`.

### 10. xUnit usa SQLite mientras prod es PostgreSQL
**`apps/api/tests/HandySuites.Tests/Integration/Common/CustomWebApplicationFactory.cs:83-89`**
SQLite no soporta jsonb, advisory locks, `PostgresException 23505`, pgvector. 7 archivos prod tienen handlers de duplicate-key que NUNCA pueden dispararse en tests. Race conditions de sync sin coverage.
**Fix**: Testcontainers.PostgreSQL con `pgvector/pgvector:pg17`.

### 11. Tests aceptan 500 InternalServerError como pass
**`apps/api/tests/HandySuites.Tests/Application/Cobros/CobroEndpointsTests.cs:81,90`**
`BeOneOf(OK, InternalServerError)` en endpoints de saldos de cobranza con comment "Complex aggregation may not work with SQLite". Cobranza saldos puede estar rota en PG y CI verde.
**Fix**: drop InternalServerError del whitelist + migrar fixture a Testcontainers PG.

### 12. PostPedido happy-path test silently no-ops
**`apps/api/tests/HandySuites.Tests/Application/Pedidos/PedidoEndpointsTests.cs:39-47`**
`if (response.StatusCode == BadRequest) return;` da impresion de validar creacion sin haberlo hecho. `PedidoService` (objeto mas complejo del dominio) sin tests directos.
**Fix**: `PedidoServiceTests.cs` con fixtures seeded en Testcontainers PG.

---

## MEDIUM (51) — categorias agregadas

| Area | Titulo | File | Fix |
|------|--------|------|-----|
| web/UI | CTAs azul/morado en lugar de bg-success | admin/announcements, billing/settings, admin/finkok, admin/crash-reports, transferir-cartera, subscription/expired, cupones | swap a `bg-success text-success-foreground` |
| web/UI | `/test-toast` accesible publicamente | apps/web/src/app/test-toast/page.tsx | mover a `(dashboard)/_dev/` o eliminar |
| i18n | Componentes/paginas hardcoded en es | TwoFactorDisable, transferir-cartera, admin/finkok, admin/crash-reports, orders filters, ZoneFilters, DiscountFilters, etc. | hookear `useTranslations`, namespace dedicado |
| web/stubs | /discounts/create con api.post comentado | discounts/create/page.tsx | eliminar ruta o cablear `discountService.create()` |
| billing | /billing/suspended con setTimeout fake | billing/suspended/page.tsx | integrar Stripe Checkout real |
| billing | /billing/payment-methods 404 | billing/suspended/page.tsx:107 | crear ruta o redirigir a /subscription |
| a11y | Skip link apunta a #main-content inexistente | layout.tsx:124 | `id="main-content" tabIndex={-1}` en `<main>` |
| a11y | DataGrid sin role=grid/row/cell | components/ui/DataGrid.tsx | refactor a `<table>` semantica |
| a11y | Headers sortable son `<div onClick>` | DataGrid.tsx:141 | `<button>` + `aria-sort` |
| a11y | Checkboxes seleccion sin aria-label | DataGrid.tsx:131,199 | agregar aria-label descriptivo |
| a11y | Input sin aria-invalid en error | components/ui/Input.tsx:26 | `aria-invalid={!!error}` |
| a11y | Checkbox custom sin `<input>` | ClientFormComponents.tsx:12 | usar Radix Checkbox |
| a11y | FormField label sin htmlFor | ClientFormComponents.tsx:55 | prop id + htmlFor |
| a11y | ErrorBanner sin role=alert | components/ui/ErrorBanner.tsx | `role="alert" aria-live="assertive"` |
| a11y | Header icon-buttons sin aria-label | components/layout/Header.tsx | agregar aria-label |
| a11y | Drawer sin focus trap | components/ui/Drawer.tsx | portar useEffect de Modal.tsx |
| a11y | ActiveToggle sin role=switch | components/ui/ActiveToggle.tsx | role=switch + aria-checked |
| a11y | SearchableSelect sin ArrowKeys | components/ui/SearchableSelect.tsx | onKeyDown + aria-activedescendant |
| a11y | Sidebar colapsado items sin aria-label | components/layout/Sidebar.tsx | aria-label cuando !showLabels |
| mobile | catch {} bare en cobros/pedidos sin telemetria | registrar.tsx, revision.tsx, recibo.tsx, varios | `crashReporter.reportCrash()` en cada catch |
| mobile/sec | SSL pinning pendiente (TODO CRIT-4) | apps/mobile-app/src/api/client.ts:13 | EAS build + `react-native-ssl-public-key-pinning` |
| mobile/sec | EXPO_PUBLIC_API_URL puede ser http:// en prod | constants.ts:9 | guard universal `if (!__DEV__ && http://) throw` |
| backend | DashboardEndpoints catch silenciado | DashboardEndpoints.cs:119 | remove catch, log via Serilog |
| backend | UsuarioEndpoints catch Exception generico | UsuarioEndpoints.cs (11 handlers) | remover try/catch o `logger.LogError(ex)` |
| backend | MobileMetasEndpoints N+1 | MobileMetasEndpoints.cs:48 | GroupBy por Tipo + slice in-memory |
| perf | Reports cargan tablas completas en memoria | ReportEndpoints.cs:131-722 | push GroupBy a SQL |
| perf | TeamLocation full table scan sin date filter | TeamLocationEndpoints.cs:76 | filtrar `> UtcNow.AddDays(-1)` |
| backend | ImportExport INNER JOIN pierde clientes | ImportExportEndpoints.cs:28 | `GroupJoin + DefaultIfEmpty` |
| sec | SupervisorEndpoints `{id}/vendedores` cross-supervisor | SupervisorEndpoints.cs:69 | usar IsStrictAdmin |
| sec | TeamLocation supervisor ve otros equipos | TeamLocationEndpoints.cs:43 | filtrar `u.SupervisorId == currentUser.UserId` |
| infra | Sin circuit breaker en Finkok | apps/billing/Program.cs:149 | Polly + timeout 30s + DLQ |
| sec | MobileAttachment sin magic bytes | MobileAttachmentEndpoints.cs:60 | `ImageUploadHelpers.ValidateImageMagicBytes` |
| perf | Sync sin request size limit | apps/mobile Program.cs | `Kestrel.Limits.MaxRequestBodySize = 5MB` + chunking |
| sec | Docker ports bind a 0.0.0.0 | docker-compose.dev.yml | prefijar `127.0.0.1:` |
| infra | Billing.Prod ASPNETCORE_URLS build-time | infra/docker/Dockerfile.Billing.Prod:50 | shell-form CMD con `${PORT}` runtime |
| db | Usuarios.email sin indice | Usuario.cs:14 | `HasIndex(u => u.Email).IsUnique()` |
| db | mobile_record_id sin index en Pedidos/Detalle/Cliente/Cobros | varios migrations | `HasIndex` parcial WHERE NOT NULL |
| db | MovimientosInventario sin composite (tenant, producto, creado_en) | InitialPostgresBaseline.cs:2246 | composite index |
| sec | Login sin lockout per-email | AuthService.cs:342 | `FailedLoginAttempts` + `LockedUntil` en Usuario |
| sec | Password min 6 chars sin complejidad | UsuarioRegisterDtoValidator.cs:16 | min 12 + mix tipos (OWASP) |
| sec | Billing CORS permite localhost en prod | apps/billing/Program.cs:43 | gate por `IsDevelopment()` |
| perf | Reports eager imports ~1.5MB bundle | reports/page.tsx:23 | `dynamic()` para reportComponents + lazy jspdf |
| perf | Reports backend in-memory GroupBy | ReportEndpoints.cs:55-722 | EF GroupBy traducible a SQL |

---

## LOW (26)

- Cupones admin: botones secundarios `bg-blue-600` (page.tsx:435,528)
- Orders/clients detail sin PageHeader + `bg-[#F9FAFB]` rompe dark mode
- tenant detail labels hardcoded (ID Fiscal, Razon Social, Contacto)
- /subscription/expired card "Mas Popular" con border-blue/badge-blue/CTA-blue
- /admin/crash-reports: ~20 strings hardcoded escapados de useTranslations
- Orders date filter placeholders "Desde"/"Hasta" hardcoded
- ZoneFilters/DiscountFilters placeholders de Select hardcoded
- team/[id]/gps aria-label hardcoded
- clients page tooltip "Aprobar prospecto" hardcoded
- Dashboard toasts permisos hardcoded
- /admin/global-users selects con labels español hardcoded
- IconButtons usan `title=` en lugar de aria-label (cobranza, promotions, OrderForm)
- Tabs en clients/[id] sin role=tablist/tab/aria-selected
- SearchableSelect clear es `<span role="button">` dentro de `<button>` (HTML invalido)
- Sidebar `<nav>` sin aria-label
- Modal no restaura foco al cerrar
- failedQueue + processQueue dead code en interceptor 401
- SyncRepository.GenerarNumeroPedidoAsync sin Select projection
- Internal /tenants/{id}/admin-emails sin validar tenant existe
- Repository search `.ToLower().Contains()` no usa pg_trgm
- MonitoringEndpoints catch vacio enmascara outages downstream
- PushNotificationService poluye NotificationHistory cross-tenant
- Workflow deploy-apis.yml sin concurrency group
- GitHub Actions sin pinning por SHA (dorny/paths-filter)
- Jwt:Secret sin validacion longitud >=32 bytes
- Stripe SDK static import en /subscription bloat

---

## i18n untranslated strings (snapshot)

Pre-prod relevantes:
- **TwoFactorSetup/TwoFactorDisable**: flujo completo de seguridad sin `useTranslations` — keys necesarias: `settings.security.twoFactor.{qrTitle, verifyTitle, recoveryTitle, codeRequired, errorGeneric, ...}`
- **admin/finkok**: pagina entera SuperAdmin — namespace `admin.finkok` con title, subtitle, headers tabla, botones
- **transferir-cartera**: warning, labels, placeholders — namespace `clients.transferCartera`
- **admin/crash-reports**: headers tabla + placeholders Select + empty states (~20 strings) — keys ya existen en en.json, solo cablear
- **Toasts hardcoded**: dashboard permisos, clients aprobar/rechazar prospecto tooltip, orders date placeholders
- **SAT regimenes fiscales**: 19 options con em-dash en `billing/settings` — mover a `constants/sat-regimenes.ts`

## Hidden/incomplete features (snapshot)

- **`/promotions/create`** — stub sin API call, accesible por URL directa (HIGH)
- **`/discounts/create`** — stub sin API call + mockProducts con marcas reales (Coca Cola, Sabritas, Lala)
- **`/billing/suspended`** — `handleReactivate` con setTimeout fake, datos hardcoded ($899, fechas 2024-2025)
- **`/billing/payment-methods`** — ruta no existe, boton lleva a 404
- **`/test-toast`** — pagina QA expuesta a usuarios autenticados
- **`/admin/finkok`** — convive con i18n parcial, indica WIP

## UX/UI improvements (snapshot)

- **CTAs primarios inconsistentes**: 6 paginas con `bg-blue-*` o `bg-purple-*` en lugar del verde canonico `bg-success`. Mas critico en `/subscription/expired` (pantalla de pago).
- **Pastel prohibido**: `bg-amber-50/border-amber-200` en warning boxes (memoria explicita pide `300/700`)
- **Emojis ⚠️ en lugar de `AlertTriangle` icon** en transferir-cartera y otros
- **Dark mode roto en order/client detail** por `bg-[#F9FAFB]` hardcoded
- **Spinner non-canonico** (`w-3.5` vs `w-4`) en admin/finkok
- **PageHeader missing** en order/client detail pages (memoria: canonical layout)

---

## Recomendacion final

**NO-GO para release inmediato.** Orden de ataque sugerido (3 sprints, ~10 dias):

### Sprint 1 (3 dias) — CRITICAL bloqueadores
1. **Rotar AMBOS secrets Cloudinary** + eliminar defaults del compose + scan gitleaks (4h)
2. **Parametrizar BillingTenantRlsInterceptor** con `set_config` + auditar TenantRlsInterceptor main (4h)
3. **Cablear SQLCipher passphrase** + refactor `_layout.tsx` async + migracion plaintext→encrypted (1.5d)
4. **Sync Visita/Cobro idempotencia** — copiar bloque dedup de UpsertPedido + UNIQUE index (4h)

### Sprint 2 (4 dias) — HIGH security/data integrity
5. **Renombrar `IsAdmin` → `IsAdminOrAbove`** + agregar `IsStrictAdmin` + audit 30+ endpoints (1d)
6. **MobileRecordId UNIQUE index** + handler `PostgresException 23505` (4h)
7. **Sync IDOR fix** — helper `EnsureBelongsToTenantAsync` aplicado a Cliente/Producto/Pedido (1d)
8. **GeoProxy rate limit** + HttpClient timeout (2h)
9. **RefreshTokens.Token index** + migration CONCURRENTLY (2h)
10. **Fix .env.production.template** JWT naming (30min) + audit Cors billing (1h)
11. **Login lockout per-email** (4h)

### Sprint 3 (3 dias) — HIGH UX + cleanup ruidoso
12. **Eliminar stubs**: /promotions/create, /discounts/create, /billing/suspended fake (2h)
13. **TwoFactorSetup i18n** completo (4h)
14. **Contacto real en /subscription/expired** (1h)
15. **Test fixtures a Testcontainers PG** — empezar por CobroEndpointsTests + PedidoEndpointsTests (1.5d)
16. **Tarea pendiente**: documentar plan de remediar MEDIUMs en post-launch sprint dedicado

### Post-launch (no bloquea)
- MEDIUM a11y refactor (DataGrid semantic table, Drawer focus trap, etc.)
- MEDIUM perf (reports SQL aggregation, dynamic imports Stripe)
- LOW i18n sweep + design system audit
- SSL pinning + circuit breaker Finkok como SEC-M2

**No proceder a `git push` ni Play Store/TestFlight hasta completar Sprint 1 + 2.**
