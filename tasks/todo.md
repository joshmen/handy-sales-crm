# Current Tasks — Auditoría Integral & Remediación

> **Fecha inicio**: 26 de febrero de 2026
> **Objetivo**: Quality Gate PASS en todas las auditorías (SonarQube, SEO, Privacy, Backend, Frontend)
> **Documento maestro**: `docs/AUDIT_MASTER_REPORT.md`
> **Compliance detallado**: `docs/PRIVACY_COMPLIANCE_ANALYSIS.md`

---

## Contexto

5 auditorías ejecutadas por agentes paralelos:
1. **Privacy Compliance** (MX LFPDPPP + US CCPA/CPRA) — 20 gaps, 0 checkpoints
2. **Backend .NET** (context7 best practices) — 10 issues
3. **Frontend TypeScript** (context7 best practices) — 66 `any`, 6x duplicados, `ignoreBuildErrors:true`
4. **SEO** — Sin robots.txt, sin sitemap, sin OG, sin JSON-LD, 0 next/image
5. **SonarQube Code Quality** — TestEndpoints público, TOTP key hardcoded, CORS wildcard, 895-line AuthService

**Quality Gate: FAIL** — ~82h de trabajo estimado en 6 fases.

---

## FASE 0: Emergencia — Seguridad (~6h) ← COMMIT GRANDE

| # | Issue | Estado |
|---|-------|--------|
| E1 | Verificar secrets no estén en git history | [ ] |
| E2 | Rotar SendGrid API key, Google OAuth secret, restringir Google Maps key | [ ] |
| E3 | Fix exception detail leak (GlobalExceptionMiddleware) | [ ] |
| E4 | Encriptar password certificado SAT (billing API) | [ ] |
| E5 | Remover `ALLOW_DEV_LOGIN` flag | [ ] |
| E6 | Fix IP spoofing X-Forwarded-For (ForwardedHeaders) | [ ] |
| E7 | Remover/proteger TestEndpoints (AllowAnonymous en prod) | [ ] |
| E8 | Eliminar fallback hardcoded TOTP key | [ ] |
| E9 | Fix CORS wildcard Vercel (→ URL específica) | [ ] |
| E10 | Fix fire-and-forget email en password reset | [ ] |
| E11 | Fix role misattribution en token refresh (SuperAdmin→ADMIN) | [ ] |

---

## FASE 1: Bugs Visibles + SEO Básico (~8h) ← COMMIT GRANDE

| # | Issue | Estado |
|---|-------|--------|
| F1 | MobileMenu logout no funciona | [ ] |
| F2 | Edit buttons no hacen nada (ProductFamily, PriceList) | [ ] |
| F3 | Activity-logs page usa mock data | [ ] |
| F4 | Billing endpoints devuelven 200 con placeholder → 501 | [ ] |
| F5 | Crear robots.ts | [ ] |
| F6 | Crear sitemap.ts | [ ] |
| F7 | Agregar Open Graph + Twitter Cards a root layout | [ ] |
| F8 | Crear OG image (1200x630) | [ ] |
| F9 | Agregar metadataBase a layout.tsx | [ ] |
| F10 | Agregar JSON-LD SoftwareApplication + Organization | [ ] |
| F11 | Reemplazar `<img>` con next/image en landing + auth | [ ] |
| F12 | Comprimir imágenes login (1.5MB → ~200KB WebP) | [ ] |
| F13 | Agregar metadata a login, forgot-password, reset-password | [ ] |
| F14 | Agregar robots noindex al dashboard layout | [ ] |

---

## FASE 2: TypeScript + Code Quality (~12h) ← COMMIT GRANDE

| # | Issue | Estado |
|---|-------|--------|
| Q1 | Quitar ignoreBuildErrors + ignoreDuringBuilds | [ ] |
| Q2 | Habilitar reactStrictMode: true | [ ] |
| Q3 | Consolidar ApiResponse (6 → 1) | [ ] |
| Q4 | Consolidar User + UserRole (6+4 → 1) | [ ] |
| Q5 | Eliminar 66 `: any` (25 archivos) | [ ] |
| Q6 | Eliminar 12 eslint-disable blanket | [ ] |
| Q7 | Limpiar ~80+ console.log/error en producción | [ ] |
| Q8 | Reemplazar Console.WriteLine con ILogger (backend) | [ ] |
| Q9 | Estandarizar error response format (4→1) | [ ] |
| Q10 | Remover dead code (useAuth mock, sync/route, mockData) | [ ] |
| Q11 | Remover backup files (.tsx.backup) | [ ] |
| Q12 | Agregar ESLint rule no-console (warn) | [ ] |

---

## FASE 3: Backend Mejoras (~13h) ← COMMIT GRANDE

| # | Issue | Estado |
|---|-------|--------|
| B1 | Fix N+1 query PedidoRepository.CrearAsync | [ ] |
| B2 | Eliminar redundant tenant filtering (double WHERE) | [ ] |
| B3 | Estandarizar soft-delete (Remove vs Activo=false) | [ ] |
| B4 | Eliminar dead Include() antes de Select() | [ ] |
| B5 | Agregar CancellationToken a endpoints | [ ] |
| B6 | Fix empty catch blocks ImpersonationService | [ ] |
| B7 | DashboardEndpoints → repository layer | [ ] |
| B8 | Fix SaveChangesAsync 3x en RegisterAsync (transacción) | [ ] |
| B9 | Fix ReportEndpoints carga todo en memoria | [ ] |
| B10 | Rate limit en /api/crash-reports | [ ] |

---

## FASE 4: Privacy Compliance MX+US (~16h) ← COMMIT GRANDE

| # | Issue | Estado |
|---|-------|--------|
| P1 | Checkbox consentimiento en /register | [ ] |
| P2 | Crear tablas policy_acceptances + policy_versions | [ ] |
| P3 | Agregar secciones faltantes LFPDPPP | [ ] |
| P4 | Crear versión en inglés Privacy Notice | [ ] |
| P5 | Agregar sección CCPA/US rights | [ ] |
| P6 | Agregar "Do Not Sell or Share" notice | [ ] |
| P7 | Re-aceptación en login cuando policy cambie | [ ] |
| P8 | Cookie consent banner | [ ] |

---

## FASE 5: Accesibilidad + SEO Avanzado (~6h) ← COMMIT GRANDE

| # | Issue | Estado |
|---|-------|--------|
| A1 | Skip-to-content link | [ ] |
| A2 | ARIA labels (stars, pricing, interactive) | [ ] |
| A3 | Footer `<a>` → `<Link>` | [ ] |
| A4 | Alt="Handy Suites" en brand logos | [ ] |
| A5 | Crear manifest.ts (PWA) | [ ] |
| A6 | Consolidar Space_Grotesk font (7→1) | [ ] |
| A7 | Review/AggregateRating schema testimonials | [ ] |
| A8 | hreflang es-MX + x-default | [ ] |
| A9 | noindex en error/not-found pages | [ ] |

---

## FASE 6: Refactoring Estructural (~20h) ← COMMITS GRADUALES

| # | Issue | Estado |
|---|-------|--------|
| R1 | Extraer DataTable/DataPage hook reutilizable | [ ] |
| R2 | Break down AuthService (895 → 5 servicios) | [ ] |
| R3 | Consolidar METODO_PAGO constants (8→1) | [ ] |
| R4 | Consolidar API_URL references (4→constants) | [ ] |
| R5 | Consolidar context/ y contexts/ | [ ] |
| R6 | Unit tests AuthService | [ ] |
| R7 | Polly retry policies (SendGrid, Cloudinary) | [ ] |

---

## Historial

### Sprint 4 (completado — commit 7b3c7da)
- [x] C4: SubscriptionPlan CRUD + enforcement service (402 responses)
- [x] C5: Aviso de privacidad (LFPDPPP) + Términos de servicio
- [x] 207 E2E passing, TypeScript 0 errores nuevos
