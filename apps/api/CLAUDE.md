# CLAUDE.md

This file provides guidance to Claude Code when working with the Main API.

## Project Overview

Handy Suites Main API — .NET 8 Web API for CRM/ERP system. Clean Architecture with Minimal APIs. Part of the Handy Suites monorepo.

## Development Commands

```bash
# Build from monorepo root
dotnet build apps/api/src/HandySales.Api/HandySales.Api.csproj

# Run via Docker (preferred — see root CLAUDE.md)
docker-compose -f docker-compose.dev.yml up -d --build api_main

# Run tests
dotnet test

# EF Core migrations (PATH fix required in bash)
export PATH="$PATH:/c/Users/AW AREA 51M R2/.dotnet/tools"
dotnet-ef migrations add <MigrationName> \
  --project libs/HandySales.Infrastructure \
  --startup-project apps/api/src/HandySales.Api \
  --output-dir Migrations

# Migrations auto-apply on API startup in dev — no manual `database update` needed

# Health check
curl -s http://localhost:1050/health
```

## Architecture

### Tech Stack
- **Framework**: .NET 8 Web API with Minimal APIs
- **Database**: MySQL 8.0 with Pomelo.EntityFrameworkCore
- **Authentication**: JWT Bearer + 2FA/TOTP + session management
- **Real-time**: SignalR (self-hosted hub at `/hubs/notifications`)
- **Validation**: FluentValidation
- **Mapping**: AutoMapper
- **Logging**: Serilog with Seq sink (port 1082)
- **Testing**: xUnit + FluentAssertions + Moq + WebApplicationFactory

### Clean Architecture Layers

1. **HandySales.Api** (`apps/api/src/HandySales.Api/`) — Presentation
   - 47 endpoint files in `/Endpoints/`
   - Configuration: CORS, JWT, Logging, DI in `/Configuration/`
   - Middleware: GlobalException, RequestLogging, Maintenance, SessionValidation, TenantFilter
   - Entry point: `Program.cs`

2. **HandySales.Application** (`libs/HandySales.Application/`) — Business Logic
   - Feature-based folders: Auth, Clientes, Productos, Pedidos, Cobros, Rutas, Inventario, etc.
   - DTOs, validators, services, interfaces

3. **HandySales.Domain** (`libs/HandySales.Domain/`) — Core Domain
   - 43 entity models in `/Entities/`
   - Common: `AuditableEntity` base class (soft deletes, audit fields)
   - No external dependencies

4. **HandySales.Infrastructure** (`libs/HandySales.Infrastructure/`) — Data Access
   - `HandySalesDbContext` with multi-tenant global query filters
   - Repository implementations with `AsNoTracking` for reads
   - `DatabaseMigrator` with MySQL advisory lock for safe auto-migration

5. **HandySales.Shared** (`libs/HandySales.Shared/`) — Cross-cutting utilities

### Key Features (2026)
- Multi-tenant with `tenant_id` global query filters + soft deletes (`EliminadoEn`)
- RBAC: SuperAdmin, Admin, Supervisor, Vendedor, Viewer roles
- Impersonation (SuperAdmin → tenant Admin) with audit trail
- SignalR real-time notifications + announcement system
- Maintenance mode middleware with auto-banner
- 2FA/TOTP with encrypted secrets + recovery codes
- Device session management with remote revocation
- Subscription plan enforcement
- Auto-seeding for new tenants (`TenantSeedService`)
- Crash report collection endpoint (mobile app)

### Database
- MySQL 8.0 (Pomelo provider), dual schemas: `handy_erp` + `handy_billing`
- Multi-tenant: all business tables have `tenant_id`
- Soft deletes via `SaveChangesAsync` override (converts `.Remove()` to `EliminadoEn` timestamp)

### Port
- **1050** — API + Swagger UI at `http://localhost:1050/swagger`
