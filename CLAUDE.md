# HandySales - Project Context

CRM/ERP system for Mexican SMEs with SAT billing compliance. Multi-tenant, microservices architecture.

## Architecture

```
Frontend (apps/web/)         -> Next.js 15 + React 19 + TypeScript + Tailwind CSS 3.4
Main API (apps/api/)         -> .NET 8, Clean Architecture, EF Core, MySQL 8.0
Mobile API (apps/mobile/)    -> .NET 8, Minimal APIs for React Native app (SEPARATE MICROSERVICE)
Billing API (apps/billing/)  -> .NET 9, SAT CFDI compliance, separate MySQL schema
Shared Libraries (libs/)     -> Domain, Application, Infrastructure, Shared (shared across microservices)
Database (infra/database/)   -> MySQL 8.0 dual: handy_erp + handy_billing
Deployment                   -> Vercel (frontend) + Railway (APIs + MySQL) ~$25-40/month
```

## Project Structure (Monorepo)

```
HandySales/                          # Root
├── apps/                            # 📱 All microservices
│   ├── api/                         # Main API Microservice .NET 8
│   │   └── src/
│   │       ├── HandySales.Api/      # Main API endpoints
│   │       └── Program.cs           # Main API configuration
│   │
│   ├── mobile/                      # Mobile API Microservice .NET 8 (SEPARATE)
│   │   └── src/
│   │       ├── HandySales.Mobile.Api/ # Mobile API endpoints
│   │       └── Program.cs            # Mobile API configuration
│   │
│   ├── billing/                     # Billing Microservice .NET 9
│   │   └── src/
│   │       ├── HandySales.Billing.Api/ # SAT CFDI invoicing
│   │       └── Program.cs            # Billing API configuration
│   │
│   └── web/                         # Frontend Next.js 15
│       ├── src/app/                 # App Router pages
│       ├── src/components/          # Radix UI + Tailwind components
│       ├── src/lib/                 # API config, auth, utils
│       ├── src/services/            # API clients
│       └── src/stores/              # Zustand state management
│
├── libs/                            # 📚 Shared Libraries (NuGet packages)
│   ├── HandySales.Domain/           # 14 entities, business rules, aggregates
│   ├── HandySales.Application/      # DTOs, validators, services, use cases
│   ├── HandySales.Infrastructure/   # EF Core, MySQL, repositories, UoW
│   └── HandySales.Shared/           # Utilities, constants, extensions, exceptions
│
├── infra/                           # 🔧 Infrastructure
│   ├── docker/                      # Dockerfiles (api, mobile, billing, web)
│   ├── azure/                       # Azure Bicep, deployment scripts
│   ├── nginx/                       # Nginx reverse proxy configs
│   └── database/                    # SQL & Data
│       ├── schema/                  # Init scripts (handy_erp, handy_billing)
│       ├── migrations/              # EF Core migrations
│       └── diagrams/                # ERD diagrams
│
├── docs/                            # 📚 Documentation
│   ├── architecture/                # Architecture & design patterns
│   ├── deployment/                  # Deployment guides
│   └── design/                      # Design assets
│       ├── pencil/                  # Pencil (.pen) designs
│       └── mockups/                 # UI screenshots
│
├── scripts/                         # 🛠️ Dev scripts
│   ├── dev-start.bat
│   └── dev-stop.bat
│
├── docker-compose.dev.yml           # Docker orchestration (all services)
└── CLAUDE.md                        # This file
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

## Technology Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15.4.6, React 19.1.0, TypeScript 5, Tailwind 3.4, Zustand, Radix UI, NextAuth.js, React Hook Form + Zod |
| Backend | .NET 8/9, C# 12, EF Core, FluentValidation, AutoMapper, Serilog, JWT Bearer |
| Database | MySQL 8.0 (Pomelo provider), multi-tenant with tenant_id |
| Infra | Docker, Azure Container Instances, Nginx, Vercel (frontend) |

## Development Setup

### Default: Frontend LOCAL + Backend in Docker

The frontend runs **locally** (NOT in Docker) for best performance. Docker volume mounts on Windows add ~3s latency per page navigation. Running locally gives instant Hot Module Replacement.

```bash
# 1. Start backend services in Docker (APIs, MySQL, Seq)
docker-compose -f docker-compose.dev.yml up -d

# 2. Start frontend locally (in separate terminal)
cd apps/web && npm run dev
```

```bash
# View logs for specific service
docker-compose -f docker-compose.dev.yml logs -f api_main
docker-compose -f docker-compose.dev.yml logs -f api_mobile
docker-compose -f docker-compose.dev.yml logs -f api_billing
```

### Alternative: Frontend in Docker (slower, only for production simulation)

```bash
docker-compose -f docker-compose.dev.yml --profile web up -d
```

### IMPORTANT: Restart After Backend Code Changes

After making changes to backend code (.NET APIs or shared libraries), you MUST restart the affected Docker containers:

```bash
# Main API changes (apps/api/ or libs/)
docker-compose -f docker-compose.dev.yml up -d --build api_main

# Mobile API changes (apps/mobile/ or libs/)
docker-compose -f docker-compose.dev.yml up -d --build api_mobile

# Billing API changes (apps/billing/)
docker-compose -f docker-compose.dev.yml up -d --build api_billing

# Multiple services changed
docker-compose -f docker-compose.dev.yml up -d --build api_main api_mobile

# All backend services (when unsure)
docker-compose -f docker-compose.dev.yml down && docker-compose -f docker-compose.dev.yml up -d
```

**Frontend changes (apps/web/)**: No restart needed — Next.js hot reload applies changes instantly when running locally.

**Only restart THIS project's containers** — never restart all Docker containers on the machine.

## Port Configuration (1000-range)

**IMPORTANT**: This project uses ports in the 1000-range to avoid conflicts with other projects.

| Service | Port | URL |
|---------|------|-----|
| **Frontend Web** | 1083 | http://localhost:1083 |
| **Main API** | 1050 | http://localhost:1050 |
| **Main API Swagger** | 1050 | http://localhost:1050/swagger |
| **Billing API** | 1051 | http://localhost:1051 |
| **Billing API Swagger** | 1051 | http://localhost:1051/swagger |
| **Mobile API** | 1052 | http://localhost:1052 |
| **Mobile API Swagger** | 1052 | http://localhost:1052/swagger |
| **phpMyAdmin (optional)** | 1081 | http://localhost:1081 |
| **Seq Logging UI** | 1082 | http://localhost:1082 |
| **Seq Ingestion API** | 1341 | http://localhost:1341 |
| **MySQL** | 3306 | localhost:3306 |

### Quick Reference
```
Frontend:    http://localhost:1083
Main API:    http://localhost:1050
Billing API: http://localhost:1051
Mobile API:  http://localhost:1052
Seq Logs:    http://localhost:1082
```

### Credentials

**MySQL Database:**
- User: `handy_user` / Password: `handy_pass`
- Root: `root` / Password: `root123`

**Application Users (password: `test123` for all):**

| Tenant | Email | Rol |
|--------|-------|-----|
| Jeyma (id=3) | admin@jeyma.com | Admin |
| Jeyma (id=3) | vendedor1@jeyma.com | Vendedor |
| Jeyma (id=3) | vendedor2@jeyma.com | Vendedor |
| Huichol (id=4) | admin@huichol.com | Admin |
| Huichol (id=4) | vendedor1@huichol.com | Vendedor |
| Huichol (id=4) | vendedor2@huichol.com | Vendedor |
| Centro (id=1) | admin@centro.com | Admin |
| Rutas Norte (id=2) | admin@rutasnorte.com | Admin |

**Recommended for testing:** `admin@jeyma.com` / `test123` (tenant with most seed data)

---

## Data Persistence

### How Docker Seeds Work

1. **First time** you run `docker-compose up`:
   - MySQL volume is empty
   - Init scripts in `/docker-entrypoint-initdb.d/` run automatically
   - All seed data (tenants, users, products, clients) is created

2. **Subsequent runs**:
   - MySQL volume has data
   - Init scripts are SKIPPED
   - Your data persists between restarts

### Seed Files (in order of execution)

| File | Purpose |
|------|---------|
| `01_init_schema_multitenant.sql` | Creates tables and schema |
| `02_seed_data.sql` | Tenants, zones, categories, clients, products (idempotent) |
| `03_create_user.sql` | Creates MySQL user `handy_user` |
| `04-billing-schema.sql` | Billing database schema |
| `05-admin.sql` | Azure/admin config |
| `06-usuarios.sql` | Application users with BCrypt passwords (idempotent) |

### IMPORTANT: Never use `-v` flag unless you want to RESET everything

```bash
# SAFE - Preserves all your data
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d

# DANGEROUS - Deletes ALL data (users, products, clients, etc.)
docker-compose -f docker-compose.dev.yml down -v   # <- NEVER use unless intentional
```

### To Reset Database (if needed)

```bash
# Stop containers
docker-compose -f docker-compose.dev.yml down

# Delete MySQL volume
docker volume rm handysales_mysql_dev_data

# Start fresh (seeds will run again)
docker-compose -f docker-compose.dev.yml up -d
```

## Conventions

- Language: Spanish (es) for UI and business terms
- Backend naming: PascalCase (C#)
- Frontend naming: camelCase (TypeScript)
- API style: RESTful with Minimal APIs
- Auth: JWT + NextAuth.js
- Multi-tenant: All tables have tenant_id column
- Billing separated by SAT compliance requirements

---

## Deployment Strategy

### Current: Vercel (Frontend) + Railway (Backend + DB) — ~$25-35/month
### Future: Azure Mexico Central (Querétaro) — when 1,000+ users

### Architecture Overview

```
┌─────────────────┐     ┌──────────────────────────────────┐
│   Vercel CDN    │     │         Railway                  │
│   (Frontend)    │────>│  ┌──────────┐  ┌──────────────┐  │
│   Next.js 15    │     │  │ Main API │  │ Billing API  │  │
│   $0/month      │     │  │ .NET 8   │  │ .NET 9       │  │
│                 │     │  │ :$PORT   │  │ :$PORT       │  │
│   Auto-deploy   │     │  └────┬─────┘  └──────┬───────┘  │
│   from GitHub   │     │       │                │          │
│                 │     │  ┌────┴────┐   ┌──────┴───────┐  │
│                 │     │  │Mobile   │   │   MySQL 8.0  │  │
│                 │     │  │API .NET8│   │  handy_erp   │  │
│                 │     │  │:$PORT   │   │  handy_billing│  │
│                 │     │  └─────────┘   └──────────────┘  │
└─────────────────┘     └──────────────────────────────────┘
```

### Production Files

| File | Purpose |
|------|---------|
| `infra/docker/Dockerfile.Main.Prod` | Main API production image (.NET 8, alpine, non-root) |
| `infra/docker/Dockerfile.Billing.Prod` | Billing API production image (.NET 9, standalone) |
| `infra/docker/Dockerfile.Mobile.Prod` | Mobile API production image (.NET 8) |
| `infra/nginx/nginx.prod.conf` | Production nginx (Azure only, Railway doesn't need it) |
| `apps/web/vercel.json` | Vercel config (auto-deploy on push to main) |
| `.env.production.template` | All env vars template (no real values) |
| `.github/workflows/deploy-apis.yml` | CI/CD: push to main → deploy APIs to Railway |

### Environment Variables

**Frontend (Vercel Dashboard):**
```
NEXTAUTH_URL=https://app.handycrm.com
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXT_PUBLIC_API_URL=https://api.handycrm.com
NODE_ENV=production
```

**Main API (Railway Dashboard):**
```
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:${PORT}
ConnectionStrings__DefaultConnection=Server=<railway-mysql>;Port=3306;Database=handy_erp;User=root;Password=<auto>;
JWT__SecretKey=<openssl rand -base64 64>
JWT__Issuer=HandySales
JWT__Audience=HandySalesUsers
JWT__ExpirationHours=24
```

**Billing API (Railway Dashboard):**
```
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:${PORT}
ConnectionStrings__BillingConnection=Server=<railway-mysql>;Port=3306;Database=handy_billing;...
ConnectionStrings__MainConnection=Server=<railway-mysql>;Port=3306;Database=handy_erp;...
JWT__SecretKey=<same as main>
```

**Mobile API (Railway Dashboard):**
```
Same as Main API
```

### Deploy Commands

```bash
# Frontend (Vercel) — automatic on push to main
git push origin main  # Vercel auto-deploys

# APIs (Railway) — via GitHub Actions or manual
railway up --service api_main
railway up --service api_billing
railway up --service api_mobile

# Build & test production Dockerfiles locally
docker build -f infra/docker/Dockerfile.Main.Prod -t handysales-api .
docker build -f infra/docker/Dockerfile.Billing.Prod -t handysales-billing .
docker build -f infra/docker/Dockerfile.Mobile.Prod -t handysales-mobile .
```

### Cost Breakdown

| Service | Provider | Cost/month |
|---------|----------|------------|
| Frontend | Vercel Free | $0 |
| 3 APIs (.NET) | Railway Pro | $15-25 |
| MySQL 8.0 | Railway | $10-15 |
| **Total** | | **$25-40** |

### Future Migration to Azure

When reaching 1,000+ active users, migrate for lower latency in Mexico:

| Service | Provider | Cost/month |
|---------|----------|------------|
| Frontend | Vercel (stays) | $0-20 |
| 3 APIs | Azure Container Apps (Querétaro) | $60-100 |
| MySQL | Azure Flexible Server (Querétaro) | $15-20 |
| **Total** | | **$75-140** |

Files ready for Azure:
- `infra/azure/container-apps.bicep` — IaC for Container Apps
- `infra/azure/mysql-database.bicep` — MySQL Flexible Server
- `infra/nginx/nginx.prod.conf` — Reverse proxy for Azure
- `docs/deployment/AZURE_MIGRATION.md` — Step-by-step migration guide

### Documentation

```
docs/deployment/
├── README.md              # General deployment overview
├── RAILWAY_SETUP.md       # Step-by-step Railway setup
├── VERCEL_SETUP.md        # Step-by-step Vercel setup
└── AZURE_MIGRATION.md     # Future migration guide
```

---

## Agent Strategy (Token Optimization)

Use the appropriate model for each task type to optimize costs without sacrificing quality:

| Agent | Model | Tasks | Cost |
|-------|-------|-------|------|
| **Explorer** | Haiku | Search code, understand structure, count files, list folders | $0.25/M (60x cheaper) |
| **Mover** | Haiku | Move/copy files, create folders, rename | $0.25/M |
| **Builder** | Haiku | Compile, run tests, validate builds | $0.25/M |
| **Coder** | Sonnet | Write new code, fix bugs | $3/M (5x cheaper) |
| **Refactor** | Sonnet | Refactor code, improve structure | $3/M |
| **Tester** | Sonnet | Write tests, validate logic | $3/M |
| **Architect** | Opus | Design systems, critical decisions, complex debugging | $15/M (max quality) |

### How to Use

When requesting tasks, Claude will automatically select the appropriate agent:

- "explora los endpoints" → **Haiku** (Explorer)
- "mueve la carpeta X a Y" → **Haiku** (Mover)
- "compila el proyecto" → **Haiku** (Builder)
- "arregla el bug en AuthService" → **Sonnet** (Coder)
- "refactoriza el módulo de clientes" → **Sonnet** (Refactor)
- "escribe tests para PedidoService" → **Sonnet** (Tester)
- "diseña la arquitectura de sync offline" → **Opus** (Architect)

### Tips for Optimal Token Usage

1. **Be specific**: "Fix null check in MobileAuthService.cs line 45" > "Fix auth bug"
2. **Divide large tasks**: Split into smaller, focused requests
3. **Use parallel agents**: Multiple Haiku explorers can run simultaneously
4. **Context in CLAUDE.md**: This file is always loaded - no extra tokens needed

---

## Plan de Pantallas — Estado Actual (Feb 2026)

### Cambios recientes aplicados al código React
- **Modal → Drawer**: Todas las páginas con formularios ahora usan Drawer lateral (no modales centrales)
- **Iconos coloridos**: Todos los iconos de acción ahora tienen colores semánticos (Search=blue, Filter=violet, Export=emerald, Edit=amber, Delete=red, etc.)
- **Mobile cards**: Todas las páginas de lista tienen vista de tarjetas para pantallas pequeñas
- **AsNoTracking**: Agregado a 107 queries de lectura en 21 repositories
- **MySQL tuning**: InnoDB buffer pool, flush settings, connection pooling
- **Encoding fixes**: UTF-8 puro en frontend, charset=utf-8 en API, double-encoding corregido en BD

### Recuento React vs Pencil

| Categoría | Cantidad |
|-----------|----------|
| Pantallas React totales | 47 |
| Pantallas Pencil totales | 49 frames |
| Match React↔Pencil | 43 (todas necesitan actualización) |
| En React pero NO en Pencil | 12 (faltantes) |
| En Pencil pero NO en React | 3 (features futuras) |

### 12 Pantallas React SIN diseño Pencil

| # | Página | Prioridad |
|---|--------|-----------|
| 1 | `login/page.tsx` | ALTA |
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

### 3 Pantallas Pencil SIN equivalente React

| Frame | Estado |
|-------|--------|
| Zonificador | Feature futura |
| Programación visitas reglas | Feature futura |
| Cargar inventario de ruta 2 | Variante legacy |

### Gaps del PLAN_MEJORAS (docs/PLAN_MEJORAS_HANDYSALES.md)

**Servicios API:**
- ~~orders.ts~~ ✅ Creado
- ~~discounts.ts~~ ✅ Creado
- ~~price-lists.ts~~ ✅ Creado
- `deliveries.ts` ❌ **SIGUE USANDO MOCK DATA**

**Stores Zustand faltantes:** No son críticos — los hooks `usePaginated{Entity}` cubren la funcionalidad.

**Features que implican pantallas nuevas:**
- Error Boundary global (componente wrapper, no pantalla) — ALTA
- Password Reset page — MEDIA
- 2FA/MFA tab en Profile/Settings — BAJA
- Email Verification page — BAJA

### Archivos Pencil

```
docs/design/pencil/pencil-new.pen        # 49 frames (principal)
docs/design/pencil/pencil-superadmin.pen  # Mismo contenido
docs/design/pencil/pencil-admin.pen       # Mismo contenido
```

### Próximos pasos de diseño
1. **Fase A**: Actualizar 43 frames existentes (iconos coloridos + Modal→Drawer)
2. **Fase B**: Crear 12 pantallas faltantes en Pencil
3. **Fase C**: Crear servicio `deliveries.ts` real (reemplazar mock data)
