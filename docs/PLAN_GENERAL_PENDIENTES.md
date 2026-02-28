# Handy Suites — Plan General de Pendientes

> **Fecha**: 26 de febrero de 2026
> **Estado del proyecto**: MVP Web desplegado en produccion (Railway + Vercel). App movil en desarrollo (38 pantallas, offline-first). Billing API funcional pero sin PAC real.

---

## Resumen Ejecutivo

| Bloque | Items | Esfuerzo estimado | Prioridad |
|--------|-------|-------------------|-----------|
| App Movil Polish + Store Release | 8 items | ~45h | ALTA |
| Marketplace de Integraciones + Facturacion SAT | 31 items | ~66h | MEDIA |
| Billing API real (PAC/PDF/Email) | 4 items | ~20h | MEDIA |
| Audit Trail (logs, historial, tickets) | 3 items | ~12h | MEDIA |
| AI Add-on (gateway + packs) | 9 items | ~80h+ | BAJA |
| Futuro lejano (Azure, roles, seguridad avanzada) | 13 items | Variable | BAJA |
| **Total pendiente activo** | **68 items** | **~143h** | — |

> Las ~143h no incluyen AI Add-on ni items de futuro lejano.

---

## 1. App Movil — Polish y Store Release (ALTA)

### 1.1 MOB-6: Polish (pendiente)

| ID | Tarea | Estado | Esfuerzo | Detalle |
|----|-------|--------|----------|---------|
| MOB-6a | Crash reporting propio | 0% | 4-6h | Tabla `CrashReports` en MySQL + endpoint `POST /api/crash-reports` + handler en app movil (ErrorUtils.setGlobalHandler) + pantalla SuperAdmin para ver crashes. Futuro: bot Telegram para alertas al celular. Sin costo extra — usa infraestructura existente (Railway MySQL). |
| MOB-6b | Error boundaries por tab | 80% | 2h | Ya existe `ErrorBoundary.tsx` wrapeando el root. Falta: wrapear cada tab individualmente para recovery parcial sin tumbar toda la app. |
| MOB-6c | Zod validation API responses | 50% | 4-6h | Zod ya instalado (`^4.3.6`) pero solo para forms. Falta: crear schemas para ~10 tipos principales (Cliente, Pedido, Producto, etc.) y validar en interceptor de respuesta. Previene bugs silenciosos cuando backend cambia un campo. |

**Items eliminados:**
- ~~MOB-6d: Session timeout~~ — Innecesario para app de vendedores de ruta. Token expiry 24h + revocacion remota por admin cubren seguridad.
- ~~MOB-6e: Performance audit~~ — Diferido hasta completar funcionalidad movil.

### 1.2 MOB-7: Store Release (pendiente)

| ID | Tarea | Estado | Esfuerzo | Detalle |
|----|-------|--------|----------|---------|
| MOB-7a | EAS Build production | 70% | 3h | `eas.json` tiene 3 profiles (dev/preview/production). Falta: submit block con credentials Apple/Google, signing config, `.env.production` separado. |
| MOB-7b | TestFlight beta (iOS) | 20% | 4h | Bundle ID configurado (`com.handysuites.app`). Falta: Apple Team ID, ASC credentials como EAS Secrets, metadata App Store. Requiere Apple Developer account ($99/ano). |
| MOB-7c | Play Internal (Android) | 20% | 4h | Package name configurado. Falta: keystore Android, Service Account JSON de Play Console, app creada en Play Console. Requiere Google Play Developer ($25 unico). |
| MOB-7d | Store metadata | 0% | 6-8h | Falta todo: descripcion corta/larga en espanol, privacy policy URL (obligatoria por location + push), screenshots iOS (5 min) y Android (5-8), feature graphic Android (1024x500). |
| MOB-7e | Production release | 60% | 12h | Funcionalidad solida (38 pantallas, offline, sync, push). Bloqueantes: crash reporting (MOB-6a), migrar LokiJSAdapter a SQLiteAdapter (2h), limpiar 29 console.log, signing certificates. |

### 1.3 Lo que YA esta hecho (movil)

- [x] MOB-1: Foundation — Auth, navigation, API client, 38 screens, 5 tabs
- [x] MOB-2: Offline Core — WatermelonDB 8 tablas, sync engine 3 fases, outbox/inbox
- [x] MOB-3: Route & Map — react-native-maps + clustering + polylines, GPS check-in 200m
- [x] MOB-4: Evidence & Payments — Fotos/firma en visita, foto comprobante cobro, upload JWT
- [x] MOB-5: Push Notifications — Expo Push API, canales Android, deep links, deployed Railway

---

## 2. Marketplace de Integraciones + Facturacion SAT (MEDIA)

> **Modelo de negocio**: Pagina "Integraciones" en el web donde el Admin activa add-ons. Facturacion SAT es la primera integracion disponible.
> **Precio**: Pago unico $1,499 MXN (facturacion) o mensual segun el add-on.

### 2.1 Fase 1: Backend — Entidades + Endpoints (~16h)

| ID | Tarea | Detalle |
|----|-------|---------|
| INT-1 | Entidad `Integration` | Catalogo global (SIN tenant_id). Campos: slug, nombre, descripcion, icono Phosphor, categoria, tipo precio (PERMANENTE/MENSUAL/GRATIS), precio MXN, estado (DISPONIBLE/PROXIMO/DESCONTINUADO). |
| INT-2 | Entidad `TenantIntegration` | Activacion por tenant. Campos: tenant_id, integration_id, estado (ACTIVA/SUSPENDIDA/CANCELADA), fecha activacion, activado_por, configuracion JSON. Index unico (tenant_id, integration_id). |
| INT-3 | Entidad `IntegrationLog` | Auditoria. Campos: tenant_id, integration_id, accion, descripcion, usuario_id, created_at. |
| INT-4 | DbContext | Registrar 3 DbSets, global query filters, unique index. |
| INT-5 | Migration EF Core | `AddIntegrationsMarketplace` |
| INT-6 | Seed SQL | 4 integraciones: Facturacion SAT (disponible), WhatsApp Business, Google Maps Avanzado, Pagos en Linea (3 proximas). |
| INT-7 | Application layer | DTOs, interface repository, service con business logic. |
| INT-8 | Repository | GetAll, GetBySlug, GetTenantIntegrations, Activar, Desactivar, CheckEstado. |
| INT-9 | Endpoints | 6 REST endpoints en `/api/integrations` (catalogo, detalle, mis integraciones, activar, desactivar, check estado). |
| INT-10 | DI + Program.cs | Registrar repository y service en contenedor. |
| INT-11 | Rebuild + verificar | Swagger, seed, 4 registros en DB. |

### 2.2 Fase 2: Frontend — Pagina Marketplace (~20h)

| ID | Tarea | Detalle |
|----|-------|---------|
| INT-12 | Types TypeScript | `IntegrationCatalog`, `TenantIntegration` interfaces. |
| INT-13 | Service API | `integrations.ts` — getAll, getBySlug, activar, desactivar, checkEstado. |
| INT-14 | Billing Service | `billing.ts` — instancia axios separada apuntando a Billing API (port 1051). Metodos facturas, catalogos, config fiscal, reportes. |
| INT-15 | Env var | `NEXT_PUBLIC_BILLING_API_URL=http://localhost:1051` |
| INT-16 | IntegrationsContext | Carga integraciones activas al iniciar sesion. Expone `hasIntegration(slug)`. |
| INT-17 | Sidebar | Item "Integraciones" con icono Plugs (fuchsia), visible solo Admin/SuperAdmin. |
| INT-18 | Middleware | Ruta `/integrations` restringida a Admin/SuperAdmin. |
| INT-19 | Pagina marketplace | `/integrations` — Grid responsivo con cards, filtro por categoria (tabs), badges estado, precios formateados, drawer activar/configurar. |
| INT-20 | BillingTab update | Si tiene facturacion activa: link a portal. Si no: link al marketplace. |

### 2.3 Fase 3: Frontend — Portal de Facturacion (~30h)

| ID | Tarea | Detalle |
|----|-------|---------|
| INT-21 | CORS Billing API | Agregar localhost:1083 y dominio Vercel. |
| INT-22 | Dashboard facturas | 4 KPIs (total, timbradas, pendientes, monto mes) + acciones rapidas + mini-tabla ultimas 5. |
| INT-23 | Lista facturas | Tabla con filtros (fecha, estado, RFC), columnas (serie-folio, fecha, cliente, total, estado), acciones (ver, timbrar, cancelar, PDF, XML). Mobile cards + paginacion. |
| INT-24 | Nueva factura | Form multi-seccion: emisor (auto), receptor (buscar cliente), detalle (lineas editables con clave SAT), resumen (subtotal, IVA, total), selects SAT (tipo, metodo, forma pago, uso CFDI). |
| INT-25 | Config fiscal | RFC, Razon Social, Regimen Fiscal, Domicilio Fiscal (CP). Upload CSD (.cer + .key + password). Config serie/folio. |
| INT-26 | Reportes | Ventas por periodo (grafica barras), top clientes facturacion, estados facturas (pie chart). |

### 2.4 Fase 4: PAC Real (DIFERIDO — no implementar ahora)

| ID | Tarea |
|----|-------|
| INT-27 | Integrar PAC real (Finkok o SW) para timbrado |
| INT-28 | Generacion PDF real con layout CFDI |
| INT-29 | XML real per esquema SAT CFDI 4.0 |
| INT-30 | Validacion certificados CSD contra SAT |
| INT-31 | Flujo cancelacion real con acuse SAT |

### 2.5 Lo que YA existe (Billing API)

| Componente | Estado |
|-----------|--------|
| Billing API (.NET 9, port 1051) | Funcional, 23 endpoints |
| DB `handy_billing` | 11 tablas + stored procedures + views |
| FacturasController | List, Create, Timbrar, Cancelar, PDF, XML, Enviar |
| CatalogosController | Tipos, Metodos, Formas pago, Usos CFDI, Config fiscal |
| ReportesController | Dashboard, ventas/periodo, top clientes, estados |
| Docker dev + prod | Configurado |
| BillingTab frontend | Placeholder "proximamente" |
| PAC real / PDF real | NO — UUID simulado, PDF placeholder |

---

## 3. Billing API — Completar para facturacion real (MEDIA)

| ID | Tarea | Detalle |
|----|-------|---------|
| BILL-1 | Conectar PAC real | Timbrado CFDI real con Finkok o SW — reemplazar mock UUID actual. |
| BILL-2 | Generacion PDF real | Layout CFDI compliant con datos fiscales del emisor/receptor. |
| BILL-3 | Email facturas | SendGrid integration para envio automatico al timbrar. |
| BILL-4 | Fix passwords | Billing API tiene passwords en plaintext — migrar a BCrypt. |
| FUT-2 | Deploy produccion | Subir Billing API a Railway ($5-10/mes extra). |

---

## 4. Audit Trail — Gaps pendientes (MEDIA)

| Tarea | Estado actual | Lo que falta |
|-------|---------------|-------------|
| Activity Logs UI | Datos se guardan en BD (ActivityLog entity) | Endpoint real + pantalla admin para ver logs (hoy es mock data). |
| Historial impersonacion | Tenant admin recibe notificacion real-time | Pantalla donde el admin del tenant pueda ver historial completo de impersonaciones de SA sobre su empresa. |
| Sistema tickets soporte | Solo campo texto `ticket_number` en impersonacion | No hay entidad Ticket ni CRUD. El campo es solo referencia a sistemas externos (JIRA, Zendesk). Evaluar si vale la pena crear sistema propio o dejar referencia externa. |

---

## 5. AI Add-on (BAJA — diseñado, no iniciado)

> **Concepto**: Gateway AI como microservicio (.NET 8, port 1053). Vende packs de IA por creditos mensuales. Usa OpenAI/Azure OpenAI + pgvector para RAG por tenant.

### 5.1 Packs vendibles

| Pack | Features principales | Precio sugerido MXN/mes |
|------|---------------------|------------------------|
| Ventas | Cross-sell, reorder predictions, client scoring, visit priority | $299-499 |
| Cobranza | Risk scoring, mensajes personalizados de cobro, probabilidad pago | $199-399 |
| Automatizacion | Resumenes visitas, busqueda semantica, OCR evidencia, digest diario | $249-449 |
| Inteligencia | Anomalias, forecasting ventas, optimizacion territorio | $399-699 |
| Todo-en-uno | Todos (20% descuento) | $899-1,499 |

### 5.2 Roadmap implementacion

| Fase | Foco | Items | Timeline |
|------|------|-------|----------|
| 1. Quick Wins | /summary + /collections-message | AI-1, AI-2, AI-3 | 2-3 semanas |
| 2. Recommendations | /recommendations + /visit-priority + creditos | AI-4, AI-5 | 3-4 semanas |
| 3. RAG & Search | pgvector + /search + /document-extract | AI-6 | 4-6 semanas |
| 4. Intelligence | /anomalies + /forecast + admin dashboard | AI-7, AI-8 | 4-6 semanas |
| 5. Mobile | Integracion AI en app movil | AI-9 | 2-3 semanas |

### 5.3 Costo estimado infraestructura

| Componente | Costo/mes |
|-----------|-----------|
| AI Gateway container (Railway) | $5-10 USD |
| PostgreSQL pgvector (Railway) | $5-7 USD |
| OpenAI API (50 tenants promedio) | $20-80 USD |
| Embeddings (text-embedding-3-small) | $5-15 USD |
| **Total AI infra** | **$35-112 USD** |
| **Revenue estimado (10 tenants x $500 MXN)** | **~$280 USD** |

### 5.4 Lo que YA esta disenado

- Arquitectura completa (endpoints, middleware, rate limiting, creditos)
- Modelo LLM por tarea (gpt-4o-mini para simple, gpt-4o para RAG/anomalias)
- Schema DB: 5 tablas nuevas (AiPlans, AiSubscriptions, AiCreditBalances, AiUsage, AiAuditLogs)
- Security: aislamiento multi-tenant, feature flags por pack, PII anonymizado
- Tool Calling: get_client_info, get_client_orders, get_overdue_portfolio

---

## 6. Futuro Lejano (BAJA)

### 6.1 Infraestructura

| ID | Tarea | Trigger |
|----|-------|---------|
| FUT-3 | Migracion a Azure Mexico Central (Queretaro) | Cuando 1,000+ usuarios activos |
| FUT-4 | Custom domain (app.handysuites.com) | Cuando haya presupuesto |
| INFRA-3 | Integration tests completos | Cuando el equipo crezca |
| INFRA-5 | Redis Streams + Push Worker directo FCM/APNs | Cuando Expo Push API no escale |
| RT-9 | SignalR mobile→web real-time | Admin ve cobros/pedidos entrar en vivo sin refrescar |

### 6.2 Roles adicionales

| ID | Tarea | Trigger |
|----|-------|---------|
| FUT-10 | Rol VIEWER funcional | Cuando haya demanda de usuarios read-only |
| SUP-1 | Sidebar/permisos SUPERVISOR | Cuando haya equipos grandes que lo necesiten |
| SUP-2 | Dashboard de equipo para supervisor | Junto con SUP-1 |
| SUP-3 | Vista rendimiento por subordinado | Junto con SUP-1 |

### 6.3 Seguridad movil avanzada (post-launch)

| ID | Tarea | Detalle |
|----|-------|---------|
| SEC-M1 | SQLCipher para WatermelonDB | Encripcion de BD local en dispositivo |
| SEC-M2 | Biometric auth | Face ID / huella para re-entrar sin re-login |
| SEC-M3 | Certificate pinning | API calls solo aceptan certificado de tu servidor |
| SEC-M4 | Root/jailbreak detection | Detectar dispositivos comprometidos |

### 6.4 Otros

| Tarea | Detalle |
|-------|---------|
| Bot Telegram alertas | Notificacion al celular del admin cuando llega un crash report |
| MOB-6e Performance audit | FlatList optimization, image caching, bundle analysis — diferido |
| Email Verification page | Pantalla verificacion email — baja prioridad |
| Diseno Pencil pendiente | 11 pantallas React sin diseno Pencil (se disenan cuando se necesiten) |

---

## 7. Lo que YA esta completado

Para referencia, esto es todo lo que ya funciona en produccion o esta listo:

### Web (47 pantallas)
- Dashboard (admin + vendedor personalizado)
- Clientes CRUD + categorias + zonas
- Productos CRUD + categorias + familias + unidades medida
- Pedidos CRUD + detalle
- Listas de precio + descuentos por cantidad + promociones
- Inventario + movimientos
- Rutas (8 paginas: lista, manage, detail, admin, load, close)
- Entregas (conectado a API real)
- Cobranza
- Usuarios CRUD + roles
- Settings (perfil empresa, datos empresa, billing tab, seguridad 2FA)
- Profile (dispositivos reales + activity log real)
- Landing page publica con 9 secciones
- Login split layout + forgot/reset password
- SuperAdmin: tenants CRUD, system dashboard, impersonacion, global settings, announcements

### Backend
- Main API .NET 8 (port 1050) — 30+ entidades, RBAC, JWT, multi-tenant
- Mobile API .NET 8 (port 1052) — sync, push notifications, attachments
- Billing API .NET 9 (port 1051) — 23 endpoints facturacion (mock PAC)
- SignalR real-time (anuncios, notificaciones, mantenimiento)
- 2FA/TOTP, session validation, device management
- Soft deletes (GDPR), EF Core migrations, CI/CD pipeline
- Desplegado en Railway + Vercel

### Seguridad
- JWT validation + httpOnly cookies + auto-refresh
- Rate limiting nginx
- RBAC completo (vendedor solo ve sus datos)
- Impersonacion con audit trail + banner + timeout
- 2FA/TOTP
- Device session management + revocacion remota
- Secretos en env vars (no en codigo)

### Mobile (38 pantallas)
- 5 tabs: Hoy / Mapa / Vender / Cobrar / Mas
- Offline-first: WatermelonDB 8 tablas, sync 3 fases
- Mapas: react-native-maps + clustering + polylines + GPS check-in
- Evidencia: fotos + firma + upload con JWT
- Push notifications: Expo Push API + canales Android + deep links

---

*Documento generado el 26 de febrero de 2026. Revisar y actualizar mensualmente.*
