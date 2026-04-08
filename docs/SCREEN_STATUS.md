# Plan de Pantallas — Estado Actual (Feb 2026)

> Extracted from CLAUDE.md — screen status tracking, React vs Pencil reconciliation.

## Cambios recientes aplicados al codigo React
- **Modal → Drawer**: Todas las paginas con formularios ahora usan Drawer lateral (no modales centrales)
- **Iconos coloridos**: Todos los iconos de accion ahora tienen colores semanticos (Search=blue, Filter=violet, Export=emerald, Edit=amber, Delete=red, etc.)
- **Mobile cards**: Todas las paginas de lista tienen vista de tarjetas para pantallas pequenas
- **AsNoTracking**: Agregado a 107 queries de lectura en 21 repositories
- **MySQL tuning**: InnoDB buffer pool, flush settings, connection pooling
- **Encoding fixes**: UTF-8 puro en frontend, charset=utf-8 en API, double-encoding corregido en BD
- **SignalR real-time**: Hub self-hosted con camelCase JSON, frontend context con auto-reconnect y subscriber registry
- **Anuncios sistema**: CRUD SuperAdmin, banners con gradientes por tipo/prioridad, animaciones suaves enter/exit, delivery instantaneo via SignalR
- **Maintenance mode**: Middleware que bloquea requests + toggle desde SuperAdmin con banner automatico (shimmer + no-dismiss)
- **2FA/TOTP**: Endpoints backend + UI setup/disable en SecurityTab, TOTP encryption service
- **Session validation**: Middleware valida sesion activa, revocacion remota de dispositivos
- **Rebranding → Handy Suites**: Nombre cambiado de HandyCRM/HandySuites a "Handy Suites" en toda la app, BD, y assets
- **Landing page** (`/`): Pagina publica con 9 secciones (hero, features, pricing, testimonios, footer). Server Component con SEO metadata
- **Login split layout** (`/login`): Panel izquierdo con imagen vendedor de ruta + gradient overlay + value props + pills App Store/Google Play. Panel derecho con form. `AuthLayout` reutilizable
- **Forgot/Reset password pages**: `/forgot-password` y `/reset-password` con AuthLayout compartido
- **LandingNav**: Componente sticky con scroll awareness, mobile hamburger, links a secciones + CTA "Comienza gratis"
- **Logo SVGs**: `logo-icon.svg`, `logo.svg`, `logo-dark.svg`, `logo-transparent.svg`
- **Favicon**: 4 cuadros de colores (rose/indigo/green/amber)
- **Logo workflow rule**: When creating or updating logos, ALWAYS generate proper SVG files with transparency. Create multiple versions: `logo.svg`, `logo-dark.svg`, `logo-transparent.svg`, `logo-icon.svg`, `favicon.svg`. All SVGs must use transparent backgrounds by default. Saved in `apps/web/public/`.
- **Tour screenshots**: Capturados via Playwright (`public/images/tour/`), usados en landing page product showcase
- **Hero dashboard screenshot**: `public/images/hero-dashboard.png` — capturado via Playwright del dashboard real de Jeyma

## Recuento React vs Pencil

| Categoria | Cantidad |
|-----------|----------|
| Pantallas React totales | 47 |
| Pantallas Pencil totales | 49 frames |
| Match React↔Pencil | 43 (todas necesitan actualizacion) |
| En React pero NO en Pencil | 10 (faltantes, login + forgot/reset completados) |
| En Pencil pero NO en React | 3 (features futuras) |

## Pantallas React SIN diseno Pencil

| # | Pagina | Prioridad |
|---|--------|-----------|
| ~~1~~ | ~~`login/page.tsx`~~ | ~~ALTA~~ ✅ Redisenado |
| 2 | `cobranza/page.tsx` | ALTA |
| 3 | `routes/page.tsx` (lista) | ALTA |
| 4 | `routes/manage/page.tsx` | ALTA |
| 5 | `clients/[id]/edit/page.tsx` | MEDIA |
| 6 | `routes/[id]/page.tsx` (detalle) | MEDIA |
| 7 | `visits/page.tsx` | MEDIA |
| 8 | `profile/page.tsx` | MEDIA |
| 9 | `roles/page.tsx` | MEDIA |
| 10 | `global-settings/page.tsx` | BAJA |
| 11 | `subscription/page.tsx` | BAJA |
| 12 | `subscription/expired/page.tsx` | BAJA |

## 3 Pantallas Pencil SIN equivalente React

| Frame | Estado |
|-------|--------|
| Zonificador | Feature futura |
| Programacion visitas reglas | Feature futura |
| Cargar inventario de ruta 2 | Variante legacy |

## Gaps del PLAN_MEJORAS

**Servicios API:**
- ~~orders.ts~~ ✅ Creado
- ~~discounts.ts~~ ✅ Creado
- ~~price-lists.ts~~ ✅ Creado
- ~~deliveries.ts~~ ✅ Conectado a API real

**Stores Zustand faltantes:** No son criticos — los hooks `usePaginated{Entity}` cubren la funcionalidad.

**Features que implican pantallas nuevas:**
- ~~Error Boundary global~~ ✅ Implementado
- ~~Password Reset page~~ ✅ Implementado
- ~~2FA/MFA tab en Profile/Settings~~ ✅ Implementado
- Email Verification page — BAJA

## Archivos Pencil

```
docs/design/pencil/pencil-new.pen        # 49 frames (principal)
docs/design/pencil/pencil-superadmin.pen  # Mismo contenido
docs/design/pencil/pencil-admin.pen       # Mismo contenido
```

## Proximos pasos de diseno
1. **Fase A**: Actualizar 43 frames existentes (iconos coloridos + Modal→Drawer)
2. **Fase B**: Crear 10 pantallas faltantes en Pencil (login y forgot/reset ya completados)
