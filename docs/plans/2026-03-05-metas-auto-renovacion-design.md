# Metas Auto-Renovacion Design

**Date**: 2026-03-05
**Status**: Approved

## Problem

1. Meta creada no aparece en la tabla (bug de visualizacion/API)
2. Admin tiene que crear manualmente una nueva meta cada semana/mes — necesita auto-renovacion

## Decision

- Add AutoRenovar boolean field to MetaVendedor entity
- AutomationEngine handler runs daily, detects expired metas with autoRenovar=true
- Creates new meta with same values + new date range, deactivates the old one
- Indefinite renewal until admin manually deactivates or deletes

## Renewal Logic (MetaAutoRenovacionHandler)

Query: AutoRenovar == true && Activo == true && FechaFin <= DateTime.UtcNow.Date

For each expired meta:
1. Calculate new dates based on Periodo:
   - mensual: FechaInicio = old.FechaFin + 1 day, FechaFin = FechaInicio + 1 month
   - semanal: FechaInicio = old.FechaFin + 1 day, FechaFin = FechaInicio + 7 days
2. Create new MetaVendedor (same UsuarioId, Tipo, Periodo, Monto, AutoRenovar=true, new dates)
3. Deactivate old meta: Activo=false

## Stop Condition

Admin deactivates meta (Activo=false) or deletes it.

## Files to Modify

### Backend
- libs/HandySuites.Domain/Entities/MetaVendedor.cs
- libs/HandySuites.Application/Metas/DTOs/MetaVendedorDto.cs
- libs/HandySuites.Application/Metas/Services/MetaVendedorService.cs
- libs/HandySuites.Infrastructure/Repositories/Metas/MetaVendedorRepository.cs
- apps/api/src/HandySuites.Api/Endpoints/MetaVendedorEndpoints.cs
- NEW: apps/api/src/HandySuites.Api/Automations/Handlers/MetaAutoRenovacionHandler.cs
- apps/api/src/HandySuites.Api/Configuration/ServiceRegistrationExtensions.cs
- EF Migration for auto_renovar column

### Frontend
- apps/web/src/services/api/metas.ts
- apps/web/src/app/(dashboard)/metas/page.tsx
- apps/web/e2e/metas.spec.ts
