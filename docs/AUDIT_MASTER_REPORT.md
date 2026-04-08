# Handy Suites — Reporte Maestro de Auditorías

> **Fecha**: 26 de febrero de 2026
> **5 auditorías**: Privacy Compliance, Backend .NET, Frontend TypeScript, SEO, SonarQube Code Quality

---

## Resumen Ejecutivo

| Auditoría | Issues Críticos | Issues Altos | Issues Medios | Issues Bajos | Score |
|-----------|----------------|-------------|---------------|-------------|-------|
| Privacy Compliance | 7 | 4 | 9 | 3 | FAIL |
| Backend .NET | 3 | 3 | 4 | 2 | WARN |
| Frontend TypeScript | 3 | 4 | 2 | 1 | FAIL |
| SEO | 4 | 6 | 7 | 6 | FAIL |
| SonarQube Code Quality | 7 | 11 | 8 | 6 | FAIL |
| **Total deduplicado** | **~18** | **~20** | **~22** | **~14** | **FAIL** |

**Quality Gate: FAIL** — Se requieren fixes antes de considerar producción como "enterprise-ready".

---

## Sprint de Remediación — Priorizado por Impacto

### FASE 0: Emergencia (Antes de cualquier deploy) — ~6h

| # | Issue | Fuente | Esfuerzo |
|---|-------|--------|----------|
| E1 | Verificar que secrets no estén en git history (`git log --all -- .env`) | SonarQube VULN-01/02/03/04 | 30m |
| E2 | Rotar SendGrid API key, Google OAuth secret, restringir Google Maps key | SonarQube VULN-01/02/04 | 30m |
| E3 | Fix exception detail leak en producción (GlobalExceptionMiddleware) | SonarQube VULN-06 / Backend #6 | 30m |
| E4 | Encriptar password certificado SAT (billing API) | SonarQube VULN-05 | 1h |
| E5 | Remover `ALLOW_DEV_LOGIN` flag (mock auth bypass risk) | SonarQube VULN-07 | 30m |
| E6 | Fix IP spoofing via X-Forwarded-For (usar ForwardedHeaders) | SonarQube VULN-09 | 30m |
| E7 | **Remover/proteger TestEndpoints** (`/api/test` AllowAnonymous en prod) | SonarQube-2 B2 | 15m |
| E8 | **Eliminar fallback hardcoded TOTP key** (HandySuites-Default-TOTP-Key-2026) | SonarQube-2 B3 | 10m |
| E9 | **Fix CORS wildcard Vercel** (`.vercel.app` → URL específica) | SonarQube-2 C4 | 10m |
| E10 | **Fix fire-and-forget email en password reset** (línea 853 AuthService) | SonarQube-2 C1 | 5m |
| E11 | **Fix role misattribution en token refresh** (SuperAdmin→ADMIN) | SonarQube-2 C2 | 5m |

### FASE 1: Bugs Visibles + SEO Básico — ~8h

| # | Issue | Fuente | Esfuerzo |
|---|-------|--------|----------|
| F1 | MobileMenu logout no funciona (solo console.log) | SonarQube BUG-02 | 15m |
| F2 | Edit buttons no hacen nada (ProductFamily, PriceList) | SonarQube BUG-01 | 30m |
| F3 | Activity-logs page usa mock data | SonarQube BUG-03 | 2h |
| F4 | Billing endpoints devuelven 200 con placeholder (cambiar a 501) | SonarQube BUG-04/05 | 30m |
| F5 | Crear `robots.ts` (bloquear /dashboard, /admin, /api/) | SEO C1 | 15m |
| F6 | Crear `sitemap.ts` (4 páginas públicas) | SEO C2 | 15m |
| F7 | Agregar Open Graph + Twitter Cards a root layout | SEO C3/C4 | 30m |
| F8 | Crear OG image (1200x630) | SEO C3 | 30m |
| F9 | Agregar `metadataBase` a layout.tsx | SEO C4 | 5m |
| F10 | Agregar JSON-LD SoftwareApplication + Organization | SEO H2 | 30m |
| F11 | Reemplazar `<img>` con `next/image` en landing + auth | SEO H4 | 1h |
| F12 | Comprimir imágenes login (1.5MB → ~200KB WebP) | SEO H5 | 30m |
| F13 | Agregar metadata a login, forgot-password, reset-password | SEO H3 | 30m |
| F14 | Agregar `robots: { index: false }` al dashboard layout | SEO M4 | 10m |

### FASE 2: TypeScript + Code Quality — ~12h

| # | Issue | Fuente | Esfuerzo |
|---|-------|--------|----------|
| Q1 | Quitar `ignoreBuildErrors: true` y `ignoreDuringBuilds: true` | Frontend TS / SEO | 30m |
| Q2 | Habilitar `reactStrictMode: true` | Frontend TS | 10m |
| Q3 | Consolidar ApiResponse (6 duplicados → 1 canónico) | Frontend TS | 1h |
| Q4 | Consolidar User + UserRole (6+4 duplicados → 1 canónico) | Frontend TS | 2h |
| Q5 | Eliminar 66 instancias de `: any` (25 archivos) | Frontend TS / SonarQube CS-04 | 4h |
| Q6 | Eliminar 12 `eslint-disable` blanket comments | Frontend TS | 1h |
| Q7 | Limpiar ~80 console.log/console.error en producción | SonarQube CS-03 | 2h |
| Q8 | Reemplazar `Console.WriteLine` con `ILogger` en backend | SonarQube BUG-07 | 1h |
| Q9 | Estandarizar formato de error response (4 patterns → 1) | SonarQube TD-04 | 2h |
| Q10 | Remover dead code (useAuth.ts mock, sync/route.ts, mockData.ts) | Frontend TS / SonarQube VULN-10 | 30m |
| Q11 | Remover backup files (.tsx.backup en settings y sidebar) | SonarQube-2 M15 | 5m |
| Q12 | Agregar ESLint rule `no-console` (warn level) | SonarQube-2 C7 | 15m |

### FASE 3: Backend Mejoras — ~10h

| # | Issue | Fuente | Esfuerzo |
|---|-------|--------|----------|
| B1 | Fix N+1 query en PedidoRepository.CrearAsync | Backend #1 | 1h |
| B2 | Eliminar redundant tenant filtering (double WHERE) | Backend #2 | 2h |
| B3 | Estandarizar soft-delete (Remove vs Activo=false) | Backend #3 | 2h |
| B4 | Eliminar dead Include() antes de Select() projections | Backend #4 | 1h |
| B5 | Agregar CancellationToken propagation a endpoints | Backend #10 / SonarQube CS-06 | 2h |
| B6 | Fix empty catch blocks en ImpersonationService | SonarQube BUG-06 | 15m |
| B7 | DashboardEndpoints: mover queries a repository layer | Backend #7 | 2h |
| B8 | Fix SaveChangesAsync 3x en RegisterAsync (usar transacción) | SonarQube-2 M11 | 1h |
| B9 | Fix ReportEndpoints carga todo en memoria (usar server-side grouping) | SonarQube-2 M6 | 2h |
| B10 | Rate limit en `/api/crash-reports` (AllowAnonymous + no limit) | SonarQube-2 C3 | 30m |

### FASE 4: Privacy Compliance — ~16h

| # | Issue | Fuente | Esfuerzo |
|---|-------|--------|----------|
| P1 | Checkpoint: checkbox consentimiento en `/register` | Privacy §3 Fase 1 | 2h |
| P2 | Crear tablas `policy_acceptances` + `policy_versions` | Privacy §6 | 2h |
| P3 | Agregar secciones faltantes LFPDPPP al aviso privacidad | Privacy §1 MX | 2h |
| P4 | Crear versión en inglés del Privacy Notice | Privacy §2 US | 3h |
| P5 | Agregar sección CCPA/US rights | Privacy §2 US | 2h |
| P6 | Agregar "Do Not Sell or Share" notice | Privacy §2 US | 1h |
| P7 | Re-aceptación en login cuando policy version cambie | Privacy §3 Fase 2 | 2h |
| P8 | Cookie consent banner (Essential / Analytics / Marketing) | Privacy §3 Fase 2 | 3h |

### FASE 5: Accesibilidad + SEO Avanzado — ~6h

| # | Issue | Fuente | Esfuerzo |
|---|-------|--------|----------|
| A1 | Skip-to-content link en root layout | SEO M3 | 15m |
| A2 | ARIA labels en star ratings, pricing cards, interactive elements | SEO M6 | 45m |
| A3 | Reemplazar footer `<a>` con `<Link>` para rutas internas | SEO M5 | 10m |
| A4 | Agregar `alt="Handy Suites"` a brand logos | SEO misc | 10m |
| A5 | Crear manifest.ts (PWA metadata) | SEO M1 | 20m |
| A6 | Consolidar Space_Grotesk font (7 instancias → 1 shared) | SEO L1 | 15m |
| A7 | Agregar Review/AggregateRating schema a testimonials | SEO P3 | 30m |
| A8 | Agregar hreflang es-MX + x-default | SEO L2 | 10m |
| A9 | Agregar noindex a error/not-found pages | SEO L6 | 5m |

### FASE 6: Refactoring Estructural — ~20h (puede ser gradual)

| # | Issue | Fuente | Esfuerzo |
|---|-------|--------|----------|
| R1 | Extraer DataTable/DataPage hook reutilizable | SonarQube DUP-01 | 8h |
| R2 | Break down AuthService (895 líneas) en 5 servicios | SonarQube CS-01 | 6h |
| R3 | Consolidar METODO_PAGO constants (8 archivos → 1) | SonarQube CS-05 | 1h |
| R4 | Consolidar API_URL references (4 archivos → constants) | SonarQube DUP-03 | 30m |
| R5 | Consolidar context/ y contexts/ directorios | SonarQube TD-05 | 30m |
| R6 | Agregar unit tests para AuthService | SonarQube TD-02 | 4h |
| R7 | Agregar Polly retry policies (SendGrid, Cloudinary) | SonarQube TD-03 | 2h |

---

## Resumen de Esfuerzo

| Fase | Esfuerzo | Prioridad | Riesgo si no se hace |
|------|----------|-----------|---------------------|
| Fase 0: Emergencia | ~6h | BLOCKER | Credenciales expuestas, info leak, auth bypass |
| Fase 1: Bugs + SEO | ~8h | CRITICAL | Usuarios ven bugs, SEO nulo |
| Fase 2: TypeScript + Quality | ~12h | HIGH | Build inseguro, deuda técnica |
| Fase 3: Backend Mejoras | ~10h | HIGH | Performance, consistencia |
| Fase 4: Privacy Compliance | ~16h | HIGH | Riesgo legal MX+US |
| Fase 5: A11y + SEO Avanzado | ~6h | MEDIUM | Accesibilidad, SEO incremental |
| Fase 6: Refactoring | ~20h | LOW | Mantenibilidad largo plazo |
| **Total** | **~82h** | — | — |

---

## Archivos Más Afectados (Top 15)

| Archivo | Issues que lo tocan |
|---------|-------------------|
| `apps/web/next.config.js` | ignoreBuildErrors, reactStrictMode, eslint, CSP |
| `apps/web/src/app/layout.tsx` | metadataBase, OG, Twitter, skip-nav, manifest |
| `apps/web/src/app/page.tsx` | next/image, JSON-LD, footer links, aria |
| `apps/api/.../GlobalExceptionMiddleware.cs` | Exception leak, error format |
| `apps/api/.../Auth/AuthService.cs` | Console.Write, god-class, unit tests |
| `apps/web/src/lib/auth.ts` | ALLOW_DEV_LOGIN, dead code |
| `apps/web/src/lib/api.ts` | API_URL, module state, console.log |
| `apps/web/src/middleware.ts` | robots noindex, route matcher |
| `apps/web/src/app/privacidad/page.tsx` | LFPDPPP gaps, English version |
| `apps/billing/.../FacturasController.cs` | Fake timbrado, PDF stub, password |
| `apps/web/src/components/layout/MobileMenu.tsx` | Logout bug |
| `apps/web/src/components/layout/Sidebar.tsx` | — |
| `apps/web/src/app/(dashboard)/products/page.tsx` | 1195 lines, extract components |
| `libs/.../ImpersonationService.cs` | Empty catch, notification retry |
| `apps/web/src/app/(dashboard)/activity-logs/page.tsx` | Mock data |

---

*Generado automáticamente por 5 agentes de auditoría el 26 de febrero de 2026.*
