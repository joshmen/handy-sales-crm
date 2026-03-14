# Checklist Maestro de Pendientes

> Historical completion tracking. Last updated: 2026-03-11.

## ✅ COMPLETADO — Seguridad (SEC-1 a SEC-6)

- [x] **SEC-1**: JWT validation habilitada (firma + lifetime en dev y prod) — `JwtExtensions.cs`
- [x] **SEC-2**: Secretos movidos a env vars (appsettings vaciados) — docker-compose + Railway
- [x] **SEC-3**: Token 30 min (prod) / 60 min (dev) + auto-refresh frontend via NextAuth
- [x] **SEC-4**: Tokens en httpOnly cookies (NextAuth) — legacy localStorage eliminado
- [x] **SEC-5**: Rate Limiting en `nginx.prod.conf` (100 req/s per IP, burst 20/10/50)
- [x] **SEC-6**: Secretos rotados — nuevo JWT base64 64 bytes, NEXTAUTH_SECRET rotado

## ✅ COMPLETADO — RBAC (Filtrado + Proteccion de rutas)

- [x] **RBAC-1**: Vendedor solo ve SUS clientes (vendedor_id = su id + NULL) — backend + frontend
- [x] **RBAC-2**: Vendedor solo ve SUS pedidos — backend `PedidoRepository` + frontend filter
- [x] **RBAC-3**: Vendedor solo ve SUS rutas — backend `RutaRepository` + frontend filter
- [x] **RBAC-4**: Visitas filtradas por usuario_id — `ClienteVisitaRepository`
- [x] **RBAC-5**: Entregas usan mismos endpoints de rutas/pedidos (ya filtrados)
- [x] **RBAC-6**: Dashboard vendedor personalizado ("Mi Rendimiento" con sus metricas reales)
- [x] **RBAC-7-10**: Middleware protege rutas por rol (`ROLE_RESTRICTED_ROUTES` + `ROUTE_PERMISSIONS` en `middleware.ts`)

## ✅ COMPLETADO — Real-time & Anuncios

- [x] **RT-1**: SignalR hub self-hosted (`NotificationHub`, `/hubs/notifications`) — camelCase JSON via `AddJsonProtocol`
- [x] **RT-2**: SignalR frontend context (`SignalRContext`) — subscriber registry, auto-reconnect, connection status
- [x] **RT-3**: Real-time notifications push (`useNotifications` hook, PascalCase-safe handlers)
- [x] **RT-4**: Announcement system CRUD — entity `Announcement` + `AnnouncementDismissal`, endpoints SuperAdmin only
- [x] **RT-5**: Announcement banners — gradient styles per tipo/prioridad
- [x] **RT-6**: Real-time banner delivery — optimistic SignalR payload construction, instant render <100ms
- [x] **RT-7**: Maintenance mode — `MaintenanceMiddleware` + `SessionValidationMiddleware`, GlobalSettings toggle
- [x] **RT-8**: 2FA/TOTP — `TwoFactorEndpoints`, `TotpEncryptionService`, SecurityTab components

## ✅ COMPLETADO — Pantallas SuperAdmin

- [x] **SA-1**: Gestion de tenants (`/admin/tenants`) — CRUD completo, batch ops, detalle con stats + users
- [x] **SA-2**: ~~Tenant switcher en header~~ DESCARTADO — impersonation cubre este caso
- [x] **SA-3**: Dashboard sistema (`/admin/system-dashboard`) — 4 KPIs, top tenants, recientes
- [x] **SA-4**: ImpersonationModal integrado en header/user menu

## ✅ COMPLETADO — Funcionalidad (FUNC-1 a FUNC-6)

- [x] **FUNC-1**: `deliveries.ts` conectado a API real — 12 metodos
- [x] **FUNC-2**: Firebase FCM — movido a BAJA (depende de app movil)
- [x] **FUNC-3**: Error Boundary global — `error.tsx` (root + dashboard) + `not-found.tsx`
- [x] **FUNC-4**: Modulo Rutas Admin — 8 paginas funcionales
- [x] **FUNC-5**: `subscription/page.tsx` conectado a `useCompany()` (CompanySettings API real)
- [x] **FUNC-6**: Auto-seeding para nuevos tenants — `TenantSeedService`

## ✅ COMPLETADO — Infraestructura

- [x] **INFRA-CI**: CI/CD pipeline (GitHub Actions + Railway auto-deploy + Vercel auto-deploy)
- [x] **INFRA-DEPLOY**: Produccion desplegada (Railway APIs + Vercel frontend + MySQL)
- [x] **INFRA-1**: EF Core Migrations — baseline generado, auto-apply en dev, efbundle en CI/CD
- [x] **INFRA-2**: Soft deletes (GDPR compliance) — 30 entidades

## ✅ COMPLETADO — Announcements DisplayMode

- [x] **ANN-1 to ANN-6**: Full announcement display mode system implemented

## ✅ COMPLETADO — Supervisor

- [x] **SUP-1**: Sidebar/permisos para SUPERVISOR — 8 endpoints + sidebar + middleware + team page
- [x] **SUP-2**: Dashboard de equipo para supervisor — KPIs endpoint + team management UI
- [x] **SUP-3**: Vista de rendimiento por subordinado

## ✅ COMPLETADO — Other

- [x] **FUT-2**: Billing API deploy en produccion
- [x] **FUT-5**: Impersonation feature completa
- [x] **FUT-6**: 2FA/MFA TOTP implementado
- [x] **FUT-7**: WebSocket (SignalR self-hosted)
- [x] **FUT-9**: Password Reset page
- [x] **FUT-10**: Rol VIEWER funcional
- [x] **INFRA-3**: Integration tests — 66 nuevos tests

## ✅ COMPLETADO — Monetizacion & Marketplace (Mar 2026)

- [x] **STRIPE-1-10**: Stripe Trial Hibrido — 14-day PRO trial, card capture, trial countdown UI, webhook handling, expiration monitor
- [x] **INT-1-9**: Marketplace Integraciones backend — 3 entities, 5 endpoints, seed data, DI
- [x] **INT-12-19**: Marketplace Integraciones frontend — types, service, sidebar item, marketplace page con cards/filtros

## ✅ COMPLETADO — Auth & Onboarding (Mar 2026)

- [x] **AUTH-RECAPTCHA**: reCAPTCHA v3 en login + register
- [x] **AUTH-INVITE**: Email invitations para team members (template + set-password flow)
- [x] **ONBOARD-1**: Onboarding wizard 4 pasos (perfil, empresa+fiscal, equipo, completado)
- [x] **METAS-RENOV**: Metas auto-renovacion
- [x] **PROD-VISUAL**: Products visual alignment

## ✅ COMPLETADO — Activity Logs

- [x] **AUDIT-1**: Activity Logs UI real con filtros (fecha, tenant, categoria, accion)

## 🟡 EN PROGRESO — App Movil React Native

- [x] **MOB-1 to MOB-5**: Foundation through Push & Notifications — COMPLETE
- [ ] **MOB-6**: Polish & Testing — Crash reporting, error boundaries, Zod validation
- [ ] **MOB-7**: Store Release — EAS Submit, TestFlight, Play Store

## 🟡 PENDIENTE — Prioridad Media (Web)

- [ ] **TRIAL-EMAIL**: Trial email sequence — 7 drip emails (Day 0-14) con ScheduledActions
- [ ] **INT-CONTEXT**: IntegrationsContext — hasIntegration(slug) global helper
- [ ] **INT-21-26**: Billing Portal frontend — Dashboard facturas, lista, nueva factura, config fiscal, reportes
- [ ] **AUDIT-IMPERF**: Historial de impersonacion — vista para admin del tenant

## 🟢 PENDIENTE — Futuro

- [ ] **FUT-3**: Migracion a Azure (cuando 1,000+ users)
- [ ] **FUT-4**: Custom domain (`app.handysuites.com`)
- [ ] **INFRA-5**: Message broker (Redis Streams) + Push Worker directo a FCM/APNs
- [ ] **RT-9**: SignalR real-time desde mobile sync → web backoffice
- [ ] **BILL-1**: Conectar PAC real para timbrado CFDI (Finkok o SW)

## 🟢 PENDIENTE — AI Add-on

- [ ] **AI-1 to AI-9**: Full AI Gateway implementation (see `docs/architecture/AI_STRATEGY.md`)
