# PENDIENTE — Marketplace de Integraciones + Facturacion SAT (INT)

> Extracted from CLAUDE.md — full specification for the integrations marketplace feature.

> **Modelo de negocio**: Add-on permanente (pago unico). La facturacion es la primera integracion disponible.
> **Arquitectura**: Marketplace extensible donde futuros add-ons (WhatsApp, Maps, Pagos) se agregan dinamicamente.
> **PAC**: Diferido — por ahora solo la arquitectura; integracion con PAC real en fase posterior.

## Lo que YA existe (Billing API)

| Componente | Estado | Ubicacion |
|-----------|--------|-----------|
| Billing API (.NET 9, port 1051) | Funcional, 23 endpoints | `apps/billing/` |
| DB `handy_billing` | 11 tablas + SP + views | `infra/database/schema/BillingSchema.sql` |
| FacturasController | List, Create, Timbrar, Cancelar, PDF, XML, Enviar | `apps/billing/.../Controllers/FacturasController.cs` |
| CatalogosController | Tipos, Metodos, Formas pago, Usos CFDI, Config fiscal, Certificados | `apps/billing/.../Controllers/CatalogosController.cs` |
| ReportesController | Dashboard, ventas/periodo, top clientes, estados, auditoria | `apps/billing/.../Controllers/ReportesController.cs` |
| Docker dev + prod | Configurado | `infra/docker/Dockerfile.Billing.Dev/Prod` |
| BillingTab frontend | PLACEHOLDER ("proximamente") | `settings/components/BillingTab.tsx` |
| PAC real / PDF real | NO — UUID simulado, PDF placeholder | Diferido a fase futura |

## INT Fase 1: Backend — Entidades + Endpoints (Main API, port 1050)

### Nuevas entidades en `libs/HandySuites.Domain/Entities/`

- [ ] **INT-1**: Crear `Integration.cs` — Catalogo platform-level (SIN tenant_id, SIN AuditableEntity)
  - Campos: `Id`, `Slug` (unique, max 50), `Nombre` (max 100), `Descripcion` (max 500), `DescripcionCorta` (max 200)
  - `Icono` (nombre Phosphor icon, e.g. "Receipt"), `Categoria` (max 50: "Facturacion"/"Comunicacion"/"Mapas"/"Pagos")
  - `TipoPrecio` (max 20: "PERMANENTE"/"MENSUAL"/"GRATIS"), `PrecioMXN` (decimal), `PrecioSetupMXN` (decimal)
  - `RequiereConfiguracion` (bool), `Estado` (max 20: "DISPONIBLE"/"PROXIMO"/"DESCONTINUADO")
  - `Orden` (int), `Version` (max 20), `CreatedAt`, `UpdatedAt`
  - Navigation: `ICollection<TenantIntegration> TenantIntegrations`

- [ ] **INT-2**: Crear `TenantIntegration.cs` — Activacion por tenant (CON tenant_id)
  - Campos: `Id`, `TenantId`, `IntegrationId`, `Estado` (ACTIVA/SUSPENDIDA/CANCELADA)
  - `FechaActivacion`, `FechaCancelacion`, `ActivadoPor` (FK Usuario)
  - `ConfiguracionJson` (string nullable, JSON flexible), `Notas` (max 500)
  - `CreatedAt`, `UpdatedAt`
  - Index unico compuesto: `(TenantId, IntegrationId)`
  - Navigation: `Tenant`, `Integration`, `ActivadoPorUsuario`

- [ ] **INT-3**: Crear `IntegrationLog.cs` — Auditoria (CON tenant_id)
  - Campos: `Id` (long), `TenantId`, `IntegrationId`, `Accion` (ACTIVAR/DESACTIVAR/CONFIGURAR/ERROR)
  - `Descripcion` (max 500), `UsuarioId`, `CreatedAt`

- [ ] **INT-4**: Registrar en `HandySuitesDbContext.cs`
  - Agregar 3 DbSets: `Integrations`, `TenantIntegrations`, `IntegrationLogs`
  - `Integration` NO tiene global query filter de tenant (es catalogo global)
  - `TenantIntegration` y `IntegrationLog` SI tienen tenant filter + `EliminadoEn == null` si aplica
  - Configurar unique index `(TenantId, IntegrationId)` en OnModelCreating

- [ ] **INT-5**: Generar EF Core migration `AddIntegrationsMarketplace`

- [ ] **INT-6**: Crear seed SQL `infra/database/schema/07_integrations_seed.sql`

- [ ] **INT-7**: Crear Application layer (DTOs, Interface, Service)

- [ ] **INT-8**: Crear Repository `IntegrationRepository.cs`

- [ ] **INT-9**: Crear Endpoints `IntegrationEndpoints.cs`
  ```
  MapGroup("/api/integrations").RequireAuthorization()
  GET  /api/integrations                    → Catalogo completo
  GET  /api/integrations/{slug}             → Detalle
  GET  /api/integrations/mis-integraciones  → Activas del tenant
  POST /api/integrations/{slug}/activar     → Activar (Admin/SuperAdmin)
  POST /api/integrations/{slug}/desactivar  → Desactivar (Admin/SuperAdmin)
  GET  /api/integrations/{slug}/estado      → Check rapido
  ```

- [ ] **INT-10**: Registrar en DI + Program.cs
- [ ] **INT-11**: Rebuild y verificar

## INT Fase 2: Frontend — Marketplace Page

- [ ] **INT-12**: Crear types `integrations.ts`
- [ ] **INT-13**: Crear service `integrations.ts`
- [ ] **INT-14**: Crear billing service `billing.ts`
- [ ] **INT-15**: Agregar env var `NEXT_PUBLIC_BILLING_API_URL`
- [ ] **INT-16**: Crear `IntegrationsContext.tsx`
- [ ] **INT-17**: Modificar Sidebar (agregar Integraciones)
- [ ] **INT-18**: Modificar middleware (permisos)
- [ ] **INT-19**: Crear marketplace page `/integrations`
- [ ] **INT-20**: Actualizar BillingTab

## INT Fase 3: Frontend — Portal de Facturacion (sub-paginas)

- [ ] **INT-21**: Actualizar CORS en Billing API
- [ ] **INT-22**: Crear dashboard facturacion-sat
- [ ] **INT-23**: Crear lista facturas
- [ ] **INT-24**: Crear nueva factura
- [ ] **INT-25**: Crear config fiscal
- [ ] **INT-26**: Crear reportes

## INT Fase 4: PAC Real (DIFERIDO)

- [ ] **INT-27**: Integrar PAC real (Finkok o SW)
- [ ] **INT-28**: Generacion PDF real con layout CFDI
- [ ] **INT-29**: XML real per esquema SAT CFDI 4.0
- [ ] **INT-30**: Validacion certificados CSD contra SAT
- [ ] **INT-31**: Flujo cancelacion real con acuse SAT

## Archivos nuevos vs modificados

**Nuevos backend (8):** Integration.cs, TenantIntegration.cs, IntegrationLog.cs, IntegrationDtos.cs, IIntegrationRepository.cs, IntegrationService.cs, IntegrationRepository.cs, IntegrationEndpoints.cs
**Nuevos frontend (10):** integrations.ts (types), integrations.ts (service), billing.ts, IntegrationsContext.tsx, integrations/page.tsx, facturacion-sat/page.tsx, facturas/page.tsx, nueva-factura/page.tsx, configuracion-fiscal/page.tsx, reportes/page.tsx
**Nuevo infra (1):** 07_integrations_seed.sql
**Modificados backend (3):** HandySuitesDbContext.cs, Program.cs (main), Program.cs (billing CORS)
**Modificados frontend (4):** Sidebar.tsx, middleware.ts, services/api/index.ts, BillingTab.tsx
**EF Migration (auto):** AddIntegrationsMarketplace

## Verificacion

1. Rebuild API → Swagger `/api/integrations` funciona (6 endpoints)
2. Seed: 4 integraciones en DB (1 DISPONIBLE + 3 PROXIMO)
3. Sidebar: "Integraciones" visible Admin/SuperAdmin, oculto Vendedor
4. Marketplace: `/integrations` muestra 4 cards correctamente
5. Activar Facturacion SAT → card cambia a "Configurar"
6. Dashboard facturacion: KPIs desde Billing API (port 1051)
7. CRUD facturas: lista, crear, timbrar (simulado), cancelar
8. Config fiscal: RFC + certificados se guardan
9. Reportes: graficas renderizan con datos
10. Permisos: Vendedor bloqueado en `/integrations`
