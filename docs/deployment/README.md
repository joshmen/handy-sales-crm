# HandySuites — Deployment Guide

## Overview

| Component | Provider | Cost | URL |
|-----------|----------|------|-----|
| Frontend | Vercel (Free) | $0/month | https://handy-sales-crm.vercel.app |
| Main API | Railway | ~$5-8/month | https://main-api-production-7566.up.railway.app |
| Mobile API | Railway | ~$3-5/month | https://mobile-api-production-f934.up.railway.app |
| Billing API | Railway (futuro) | ~$3-5/month | _(pendiente)_ |
| PostgreSQL 16 | Railway | ~$10-15/month | postgres.railway.internal:5432 |
| **Total** | | **~$18-28/month** | |

## Architecture

```
Users (Mexico)
     |
     +---> Vercel CDN (Edge) ---> Next.js 15 Frontend
     |                              |
     |                              +-- NEXTAUTH_URL -> https://handy-sales-crm.vercel.app
     |                              +-- API_URL -> https://main-api-production-7566.up.railway.app (server-side)
     |                              +-- NEXT_PUBLIC_API_URL -> (same, baked at build-time for client)
     |
     +---> Railway (US) ---> Main API (.NET 8) ---+
              |                                    |
              +---> Mobile API (.NET 8) -----------+---> PostgreSQL 16
              |                                    |    +-- handy_erp
              +---> Billing API (.NET 9) (futuro) -+    +-- handy_billing
```

## Setup Guides

1. **Backend + DB**: [RAILWAY_SETUP.md](RAILWAY_SETUP.md) — PostgreSQL, Main API, Mobile API
2. **Frontend**: [VERCEL_SETUP.md](VERCEL_SETUP.md) — Next.js en Vercel
3. **Future Azure migration**: [AZURE_MIGRATION.md](AZURE_MIGRATION.md)

## Critical Notes

### NEXT_PUBLIC_API_URL es build-time
La variable `NEXT_PUBLIC_API_URL` se embebe en el JavaScript del cliente durante `next build`.
Si la cambias en Vercel, DEBES hacer **Redeploy sin cache** para que tome efecto.
Sin esto, el navegador sigue llamando a `http://localhost:1050`.

### SSL Mode=Require es obligatorio en produccion
PostgreSQL 16 en Railway requiere SSL. Sin `SSL Mode=Require;Trust Server Certificate=true` en el connection string,
las APIs fallan al conectar. (Nota: `AllowPublicKeyRetrieval` era un flag de MySQL 8.0 — ya no aplica.)

### CORS: SetIsOriginAllowed, no WithOrigins
ASP.NET Core `WithOrigins()` NO soporta wildcards como `*.vercel.app`.
Se usa `SetIsOriginAllowed()` con predicado en `CorsExtensions.cs`.

### Root Directory en Railway: VACIO
Los Dockerfiles del monorepo hacen `COPY libs/` y `COPY apps/` desde la raiz.
Si pones Root Directory, Railway cambia el contexto y los COPY fallan.

### Dockerfiles: Shell form CMD
Railway inyecta `PORT` en runtime. Los Dockerfiles usan:
```dockerfile
CMD ASPNETCORE_URLS=http://+:${PORT:-5000} exec dotnet App.dll
```
NO usar `ENV ASPNETCORE_URLS=...` porque se evalua en build-time.

## CI/CD

- **Frontend**: Auto-deploy on push to `main` via Vercel GitHub integration
- **Backend**: Auto-deploy on push to `main` via Railway GitHub integration
  - Watch Paths limitan que cambios triggerean deploy
  - `libs/**` triggerean Main API y Mobile API (comparten codigo)

## Environment Variables Summary

### Vercel (Frontend)

| Variable | Descripcion | Scope |
|----------|-------------|-------|
| `NEXTAUTH_SECRET` | Secret para firmar sesiones NextAuth | Production |
| `NEXTAUTH_URL` | URL del frontend | Production |
| `API_URL` | URL de Railway Main API (server-side only) | Production |
| `NEXT_PUBLIC_API_URL` | URL de Railway Main API (client-side, build-time) | Production |

### Railway APIs

| Variable | Descripcion |
|----------|-------------|
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection string (Npgsql format con SSL) |
| `JWT__SecretKey` | DEBE ser identico en todas las APIs |
| `JWT__Issuer` | `HandySuites` |
| `JWT__Audience` | `HandySuitesUsers` |
| `ASPNETCORE_ENVIRONMENT` | `Production` |

## Production Dockerfiles

| File | Service | .NET Version |
|------|---------|-------------|
| `infra/docker/Dockerfile.Main.Prod` | Main API | .NET 8 |
| `infra/docker/Dockerfile.Mobile.Prod` | Mobile API | .NET 8 |
| `infra/docker/Dockerfile.Billing.Prod` | Billing API | .NET 9 |

Features: Alpine images, multi-stage builds, non-root user, dynamic PORT, health checks.

## Database

Two databases in one PostgreSQL 16 instance:
- `handy_erp` — Main application data (multi-tenant)
- `handy_billing` — SAT CFDI billing data

Import method: pg_dump / psql from local Docker → Railway.

## Test Credentials

Ver credenciales de prueba en CLAUDE.md (seccion "Application Users").
