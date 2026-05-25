# Auditoría general HandySales — 2026-05-25

Reporte priorizado: OWASP backend + UX frontend + arquitectura información (sidebar/forms).

3 agentes en paralelo: backend security (file:line, 58 endpoints), frontend UX (10 páginas sampling), IA/forms (sidebar tree + 11 forms).

---

## Executive summary

Postura defensiva del backend es **madura** (TOTP, lockout, CSP, HSTS, BCrypt, rate limiting). 3 gaps menores. Frontend tiene **base sólida** (PageHeader, design tokens) pero duplicación importante en formularios cliente (~750 LOC × 2 = 1500). Sidebar tiene 2 misplacements y 2 settings overlap.

**Findings priorizados:**

| Sev | Count | Esfuerzo total estimado |
|---|---|---|
| CRITICAL | 0 | — |
| HIGH | 5 | ~2-3 días |
| MEDIUM | 9 | ~3-5 días |
| LOW | 8 | ~2 días polish |

---

## HIGH — security/correctness gaps que merecen sprint corto

### H-1. ClienteEndpoints `GET /clientes/{id}` IDOR check implícito
- **Archivo**: `apps/api/src/HandySuites.Api/Endpoints/ClienteEndpoints.cs:70`
- **Riesgo**: Endpoint toma `id` y llama `ObtenerPorIdAsync(id)`. Si el service no filtra por `_tenant.TenantId`, lectura cross-tenant.
- **Verificación**: Leer `ClienteService.ObtenerPorIdAsync` y confirmar filtro tenant. Si OK, hacer el filtro **explícito** en el endpoint (defense in depth).
- **Esfuerzo**: 30 min

### H-2. AiEndpoints sin `RequireAuthorization()`
- **Archivo**: `apps/api/src/HandySuites.Api/Endpoints/AiEndpoints.cs:1489-1490`
- **Riesgo**: Endpoint de refresh materialized views chequea rol en runtime con `await _next(context)` en lugar de decorator. Si el orden de middleware cambia, role check podría no ejecutarse.
- **Fix**: Agregar `.RequireAuthorization()` al `MapPost(...)` correspondiente.
- **Esfuerzo**: 15 min

### H-3. RequestLoggingMiddleware loguea QueryString sin redacción
- **Archivo**: `apps/api/src/HandySuites.Api/Middleware/RequestLoggingMiddleware.cs:52`
- **Riesgo**: A09 logging failure. Tokens/emails en query string llegan a Serilog → Seq/Application Insights raw.
- **Fix**: Filter Serilog que enmascara `token=`, `code=`, `email=`, `password=`, `apikey=` en query strings.
- **Esfuerzo**: 1-2 horas

### H-4. Cliente form duplicado 95% (1500 LOC duplicados)
- **Archivos**: `apps/web/src/app/(dashboard)/clients/new/page.tsx` (~750 LOC) + `clients/[id]/edit/page.tsx` (~750 LOC)
- **Impacto**: Cada cambio (campo tier, hint, validación) requiere 2 edits sincronizados. Hint divergencia detectada en el audit del feature anterior fue ejemplo concreto.
- **Fix**: Extraer `<ClientForm mode="create" | "edit">` a `apps/web/src/components/clients/ClientForm.tsx`. Las páginas quedan en ~50 LOC cada una.
- **Esfuerzo**: 4-6 horas (refactor + smoke E2E)

### H-5. Sidebar: "Transferir cartera" mal ubicado
- **Archivo**: `apps/web/src/components/layout/Sidebar.tsx`
- **Estado actual**: Bajo "Equipo > Equipo > Transferir cartera" 
- **Problema**: La feature reasigna clientes, no edita usuarios del equipo. Pertenece al dominio "Clientes".
- **Fix propuesto**: Mover a "Clientes > Administración > Reasignar cartera" o crear sección "Clientes > Operaciones masivas".
- **Esfuerzo**: 30 min (1 archivo, plus tests E2E)

---

## MEDIUM — mejoras de calidad sin urgencia

### M-1. Settings overlap: /settings vs /billing/settings vs PerfilEmpresaTab
- **Archivos**: `apps/web/src/app/(dashboard)/settings/page.tsx` + `apps/web/src/app/(dashboard)/billing/settings/page.tsx`
- **Problema**: 3 lugares manipulan "datos de empresa":
  - `/settings` (CompanyTab) → logo, nombre, colores → `companyService`
  - `/settings` (PerfilEmpresaTab) → razón social, RFC, dirección → `datosEmpresaService`
  - `/billing/settings` → CSD cert, series, mapeo fiscal → `billingService`
- **Fix**: Documentar la separación (campo "API origen" en cada sección) o unificar en `/settings?tab=...`.
- **Esfuerzo**: 30 min documentar / 4 horas unificar

### M-2. Discounts vs Promotions distinción borrosa
- **Archivos**: `apps/web/src/app/(dashboard)/discounts/create/page.tsx` + `promotions/create/page.tsx`
- **Problema**: Ambos bajo "Precios" en sidebar, no es obvio cuándo usar cada uno. Solo create page (no edit).
- **Fix**: Investigar lógica de negocio. Si overlap significativo → consolidar. Si distintos → mejorar copy del sidebar + hints.
- **Esfuerzo**: 1 hora investigar, 2-4 horas consolidar

### M-3. Routes / Invoices missing create/edit pages
- **Archivos**: No existen `routes/new`, `routes/[id]/edit`, `billing/invoices/[id]/edit`
- **Hipótesis**: Routes creadas vía API o template; invoices son immutable por compliance SAT.
- **Fix**: Confirmar intencional. Si sí → no hacer nada. Si no → identificar feature gap.
- **Esfuerzo**: 30 min verificar

### M-4. Orders status colors hardcoded (22 occurrences)
- **Archivo**: `apps/web/src/app/(dashboard)/orders/page.tsx:63-84`
- **Fix**: Extraer a `apps/web/src/lib/constants/orderStatusStyles.ts` con map `EstadoPedido → { color, label, icon }`.
- **Esfuerzo**: 1 hora

### M-5. Zones page custom table (no usa DataGrid)
- **Archivo**: `apps/web/src/app/(dashboard)/zones/page.tsx:489-577`
- **Fix**: Migrar a `DataGrid` con `mobileCardRenderer` (mismo patrón que clients/products/orders).
- **Esfuerzo**: 2-3 horas

### M-6. ExecuteSqlRaw en AiEndpoints (admin-only)
- **Archivo**: `apps/api/src/HandySuites.Api/Endpoints/AiEndpoints.cs:1489-1490`
- **Fix**: Cambiar a `ExecuteSqlInterpolated` para defense in depth (aun siendo sprocs sin input).
- **Esfuerzo**: 15 min

### M-7. Batch toggle de Usuarios sin rate limit específico
- **Archivo**: `apps/api/src/HandySuites.Api/Endpoints/UsuarioEndpoints.cs:69-72`
- **Fix**: Aplicar `RequireRateLimiting("authenticated")` explícitamente; idealmente policy custom de 10 ops/min para batch.
- **Esfuerzo**: 30 min

### M-8. Schema Zod inline en ZonesPage
- **Archivo**: `apps/web/src/app/(dashboard)/zones/page.tsx:56-72`
- **Fix**: Mover a `apps/web/src/lib/validations/zone.ts` (mismo patrón que `client.ts`).
- **Esfuerzo**: 20 min

### M-9. Dashboard inline CSS variables
- **Archivo**: `apps/web/src/app/(dashboard)/dashboard/page.tsx:461, 478, 729, 748`
- **Fix**: `style={{ color: 'var(--company-primary-color, #16a34a)' }}` → usar Tailwind plugin o consumir desde Zustand theme store.
- **Esfuerzo**: 1 hora

---

## LOW — polish

### L-1. Auditoría de global query filters en `HandySuitesDbContext.OnModelCreating`
Verificar que TODAS las entities con `TenantId` tengan `HasQueryFilter`. Lista exhaustiva esperada: ~45 entities según RLS deployment Apr 19.
**Esfuerzo**: 1 hora

### L-2. Aria-label coverage 24% — agregar a SearchableSelect triggers, Drawer triggers, batch action buttons
**Esfuerzo**: 2-3 horas barrido

### L-3. Codigo de barras Producto sin uniqueness check per tenant
**Esfuerzo**: 30 min + migration

### L-4. PrecioBase sin cap superior (validación)
**Esfuerzo**: 15 min

### L-5. ListaPrecio.Nombre sin MaximumLength validator
**Esfuerzo**: 10 min

### L-6. JSON `clienteId: null` → 500 (System.Text.Json int parsing)
Usar `[JsonConverter(typeof(NullableIntConverter))]` o `[Required]`.
**Esfuerzo**: 1 hora

### L-7. E2E Playwright no está en CI
Agregar workflow `.github/workflows/playwright-e2e.yml` que corra en PRs.
**Esfuerzo**: 2-3 horas (Docker compose + secrets + storage state)

### L-8. Lucide/Phosphor mixing (legado)
Migrar resto de pages a Phosphor (primary del design system) consistentemente.
**Esfuerzo**: 4-6 horas barrido

---

## OWASP Scorecard

| Categoría | Status | Findings |
|---|---|---|
| A01 Access Control | 🟡 | H-1 IDOR endpoint, impersonation edge cases |
| A02 Cryptographic | 🟢 | BCrypt + SHA256 + env keys, sin hardcoded secrets |
| A03 Injection | 🟡 | M-6 ExecuteSqlRaw admin-only |
| A04 Insecure Design | 🟡 | M-7 batch-toggle unthrottled |
| A05 Config | 🟢 | CORS allowlist, CSP strict-dynamic, HSTS, X-Frame-Options |
| A07 Auth | 🟢 | TOTP enforced, account lockout, PwnedPassword check |
| A08 Integrity | 🟢 | Pinned NuGet versions |
| A09 Logging | 🟡 | H-3 PII leak en query string |
| A10 SSRF | 🟢 | URLs hardcoded o desde env |

**Promedio**: 5 GREEN, 4 YELLOW, 0 RED.

---

## Sidebar — recomendaciones de arquitectura información

**Problema central**: Sidebar refleja mental model de **dominios de backend** (Equipo, Ventas, Catálogo, Operación, Empresa) en lugar de **tareas de usuario**.

**Misplacements detectados**:
1. **H-5**: "Transferir cartera" bajo Equipo (debe estar bajo Clientes)
2. **M-1**: "Configuración fiscal" vive en /billing/settings pero usuarios la buscan en /settings → falta breadcrumb o link cruzado

**Items que merecen reorganización (opinión)**:
- "Categorías de clientes", "Categorías de productos", "Familias de productos", "Unidades de medida", "Tasas de impuesto" son **catálogos administrativos** (low-frecuencia uso). Considerar grouping bajo "Configuración → Catálogos" en vez de nivel 2 en sidebar principal.
- "Histórico GPS" + "Registro de actividad" son **auditoría/logs**. Considerar sección "Auditoría" propia.
- "Asistente IA" colgando de Empresa es raro. Es feature transversal — debería ser FAB global o sección propia.

**Cambios propuestos sidebar** (orden de impacto):
1. Mover "Transferir cartera" → "Clientes > Operaciones masivas > Reasignar cartera" (H-5)
2. Crear "Configuración → Catálogos" con los 5 catálogos admin (M-9 grouping)
3. Mover "Asistente IA" a sección propia o FAB global
4. Linkear cross-references: /settings → "¿Buscas configuración fiscal? Ve a Facturación > Configuración"

---

## Recomendaciones de ejecución

**Sprint corto (1 semana, ~12 horas)** — atacar todos los HIGH:
- H-1, H-2, H-3 (security)
- H-4 (refactor ClientForm — el de mayor ROI por LOC eliminado)
- H-5 (sidebar move)

**Sprint medio (2 semanas, ~20 horas)** — agregar 3-4 MEDIUM más:
- M-1 (settings docs/unificación)
- M-4 (orders status constants)
- M-7 (batch rate limit)
- M-8 (zone Zod externalize)

**Backlog polish** — LOW items según vayan agrupándose con otras features tocando el mismo archivo.

---

## Archivos críticos a tocar

| Archivo | HIGH | MEDIUM | LOW |
|---|---|---|---|
| `apps/api/src/HandySuites.Api/Endpoints/ClienteEndpoints.cs` | H-1 | | |
| `apps/api/src/HandySuites.Api/Endpoints/AiEndpoints.cs` | H-2 | M-6 | |
| `apps/api/src/HandySuites.Api/Middleware/RequestLoggingMiddleware.cs` | H-3 | | |
| `apps/web/src/app/(dashboard)/clients/new/page.tsx` | H-4 | | |
| `apps/web/src/app/(dashboard)/clients/[id]/edit/page.tsx` | H-4 | | |
| `apps/web/src/components/layout/Sidebar.tsx` | H-5 | | |
| `apps/web/src/app/(dashboard)/settings/page.tsx` | | M-1 | |
| `apps/web/src/app/(dashboard)/orders/page.tsx` | | M-4 | |
| `apps/web/src/app/(dashboard)/zones/page.tsx` | | M-5, M-8 | |
| `apps/web/src/app/(dashboard)/dashboard/page.tsx` | | M-9 | |
| `apps/api/src/HandySuites.Api/Endpoints/UsuarioEndpoints.cs` | | M-7 | |
| `libs/HandySuites.Infrastructure/Persistence/HandySuitesDbContext.cs` | | | L-1 |

---

## Lo que NO está auditado en esta pasada

- **Mobile app (React Native)**: scope separado. La memoria menciona MOB-6 polish DONE + SEC-M1 al 80%. Auditarlo requiere otro pass.
- **Billing API**: solo se vio integración con Main API. CFDI compliance y SAT-specific risks no auditados a fondo.
- **AI Gateway**: spec/RAG security no auditado.
- **Mobile API**: solo se vio referencia a `TenantRlsInterceptor`. Auditar endpoints standalone.

Para un siguiente pass: pedir auditoría focused en cualquiera de los 4 arriba.
