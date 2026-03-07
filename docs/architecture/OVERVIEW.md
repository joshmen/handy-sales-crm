# Architecture Overview

> Extracted from CLAUDE.md — architecture diagram, entities, endpoints, and tech stack.

## Architecture Diagram

```
Frontend (apps/web/)         -> Next.js 15 + React 19 + TypeScript + Tailwind CSS 3.4
Main API (apps/api/)         -> .NET 8, Clean Architecture, EF Core, PostgreSQL 16
Mobile API (apps/mobile/)    -> .NET 8, Minimal APIs for React Native app (SEPARATE MICROSERVICE)
Billing API (apps/billing/)  -> .NET 9, SAT CFDI compliance, separate PostgreSQL schema
Mobile App (apps/mobile-app/) -> React Native (Expo), TypeScript, WatermelonDB, offline-first
AI Gateway (apps/ai/)         -> .NET 8, OpenAI/Azure OpenAI, pgvector, RAG per tenant
Shared Libraries (libs/)     -> Domain, Application, Infrastructure, Shared (shared across microservices)
Database (infra/database/)   -> PostgreSQL 16 dual: handy_erp + handy_billing
Deployment                   -> Vercel (frontend) + Railway (APIs + PostgreSQL) ~$25-40/month
```

## Core Business Entities

- **Usuario** - Users with roles/permissions
- **Cliente** - Customers, **CategoriaCliente** - Customer categories, **Zona** - Geographic zones
- **Producto** - Products, **CategoriaProducto** - Product categories, **FamiliaProducto** - Product families
- **UnidadMedida** - Units of measurement
- **ListaPrecio** - Price lists, **PrecioPorProducto** - Product pricing per list
- **DescuentoPorCantidad** - Quantity discounts, **Promocion** - Promotions
- **Inventario** - Stock tracking

## API Endpoints

### Main API (Port 1050)
`/api/auth`, `/api/users`, `/api/clients`, `/api/products`, `/api/orders`, `/api/inventory`, `/api/movimientos-inventario`, `/api/routes`, `/api/dashboard`, `/health`

### Billing API (Port 1051)
`/api/facturas`, `/api/catalogos`, `/api/reportes`, `/health`

### Mobile API (Port 1052)
`/api/mobile/auth`, `/api/mobile/sync`, `/api/mobile/clients`, `/api/mobile/products`, `/health`

### AI Gateway (Port 1053)
`/api/ai/summary`, `/api/ai/recommendations`, `/api/ai/collections-message`, `/api/ai/search`, `/api/ai/document-extract`, `/api/ai/usage`, `/health`

## Technology Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15.4.6, React 19.1.0, TypeScript 5, Tailwind 3.4, Zustand, Radix UI, NextAuth.js, React Hook Form + Zod |
| Backend | .NET 8/9, C# 12, EF Core, FluentValidation, AutoMapper, Serilog, JWT Bearer |
| Mobile | React Native 0.76+, Expo SDK 52, TypeScript 5, WatermelonDB, Zustand, TanStack Query, react-native-maps, FCM |
| AI | .NET 8, OpenAI API (gpt-4o-mini default), pgvector, text-embedding-3-small |
| Database | PostgreSQL 16 (Npgsql provider), multi-tenant with tenant_id |
| Infra | Docker, Azure Container Instances, Nginx, Vercel (frontend) |
