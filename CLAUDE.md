# HandySales - Project Context

CRM/ERP system for Mexican SMEs with SAT billing compliance. Multi-tenant, microservices architecture.

## Architecture

```
Frontend (apps/web/)         -> Next.js 15 + React 19 + TypeScript + Tailwind CSS 3.4
Main API (apps/api/)         -> .NET 8, Clean Architecture, EF Core, MySQL 8.0
Mobile API (apps/mobile/)    -> .NET 8, Minimal APIs for React Native app (SEPARATE MICROSERVICE)
Billing API (apps/billing/)  -> .NET 9, SAT CFDI compliance, separate MySQL schema
Mobile App (apps/mobile-app/) -> React Native (Expo), TypeScript, WatermelonDB, offline-first
AI Gateway (apps/ai/)         -> .NET 8, OpenAI/Azure OpenAI, pgvector, RAG per tenant
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
│   ├── mobile-app/              # React Native App (Expo Dev Client)
│   │   ├── app/                 # Expo Router (file-based navigation)
│   │   └── src/                 # API client, DB, sync, stores, hooks
│   │
│   ├── ai/                      # AI Gateway Microservice .NET 8
│   │   └── src/
│   │       └── HandySales.Ai.Api/   # AI endpoints + LLM routing
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

### AI Gateway (Port 1053)
`/api/ai/summary`, `/api/ai/recommendations`, `/api/ai/collections-message`, `/api/ai/search`, `/api/ai/document-extract`, `/api/ai/usage`, `/health`

## Technology Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15.4.6, React 19.1.0, TypeScript 5, Tailwind 3.4, Zustand, Radix UI, NextAuth.js, React Hook Form + Zod |
| Backend | .NET 8/9, C# 12, EF Core, FluentValidation, AutoMapper, Serilog, JWT Bearer |
| Mobile | React Native 0.76+, Expo SDK 52, TypeScript 5, WatermelonDB, Zustand, TanStack Query, react-native-maps, FCM |
| AI | .NET 8, OpenAI API (gpt-4o-mini default), pgvector, text-embedding-3-small |
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
| **AI Gateway** | 1053 | http://localhost:1053 |
| **AI Gateway Swagger** | 1053 | http://localhost:1053/swagger |
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
AI Gateway:  http://localhost:1053
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

## Git Workflow Rules

- **NEVER push automatically.** Always test locally first. Only push when the user explicitly requests it.
- Commits are fine without asking, but `git push` requires explicit user instruction.

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

## EF Core Migrations

Schema changes are managed via EF Core Migrations. The baseline migration (`20260220015145_InitialBaseline`) captures the full schema. All future changes go through `dotnet ef migrations add`.

### Developer Workflow

```bash
# Generate a new migration after changing entities/DbContext
dotnet ef migrations add DescripcionDelCambio \
  --project libs/HandySales.Infrastructure \
  --startup-project apps/api/src/HandySales.Api \
  --output-dir Migrations

# Apply locally (also auto-applies on Main API startup in dev)
docker-compose -f docker-compose.dev.yml up -d --build api_main

# Revert last migration (if not yet applied)
dotnet ef migrations remove \
  --project libs/HandySales.Infrastructure \
  --startup-project apps/api/src/HandySales.Api

# List migrations and their status
dotnet ef migrations list \
  --project libs/HandySales.Infrastructure \
  --startup-project apps/api/src/HandySales.Api
```

### How It Works

| Environment | Strategy | Details |
|-------------|----------|---------|
| **Dev (Docker)** | Auto-apply on startup | `DatabaseMigrator.MigrateAsync()` in `Program.cs`, MySQL advisory lock prevents concurrent runs |
| **Production (CI/CD)** | `efbundle` before deploy | GitHub Actions builds bundle, applies to Railway/Azure MySQL, then deploys APIs |
| **Mobile API** | Skips migrations | `RUN_MIGRATIONS=false` — shares same DB as Main API |

### Key Files

- Migrations: `libs/HandySales.Infrastructure/Migrations/`
- Migrator: `libs/HandySales.Infrastructure/Persistence/DatabaseMigrator.cs`
- Factory: `libs/HandySales.Infrastructure/Persistence/DesignTimeDbContextFactory.cs`
- CI/CD: `.github/workflows/deploy-apis.yml` (`migrate-database` job)
- Docker baseline: `infra/database/schema/05_ef_migrations_baseline.sql`

### Important

- **NEVER** delete or modify existing migration files that have been applied to production
- **ALWAYS** commit the `Migrations/` folder — it's the source of truth for schema
- Docker init SQL scripts are frozen at baseline — all new changes go through EF migrations
- GitHub Secret required: `PRODUCTION_DB_CONNECTION_STRING`

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

## React Native Mobile App (apps/mobile-app/)

> **NOTA**: `apps/mobile/` = .NET 8 backend API (port 1052). `apps/mobile-app/` = React Native frontend.

### Stack

- React Native 0.76+ via **Expo SDK 52 (Dev Client)** — no Expo Go (needs native modules)
- Expo Router (file-based), Zustand + TanStack Query, React Hook Form + Zod
- **WatermelonDB** (SQLite-backed, lazy loading, reactive) para offline
- **MMKV** para sync cursors y preferences
- **expo-secure-store** para JWT/refresh tokens
- **react-native-maps** + expo-location para mapas
- **@react-native-firebase/messaging** para push (FCM + APNs via FCM)
- **EAS Build + EAS Submit** para CI/CD (TestFlight + Play Internal)
- **Sentry React Native** para crash reporting

### Folder Structure

```
apps/mobile-app/
├── app/                    # Expo Router
│   ├── (auth)/             # Login, forgot-password
│   ├── (tabs)/             # Dashboard, clientes, ruta, pedidos, perfil
│   ├── entrega/            # Delivery (signature + evidence)
│   └── cobro/              # Payment collection
├── src/
│   ├── api/                # Axios client + typed endpoints
│   ├── db/                 # WatermelonDB schema, models, migrations
│   ├── sync/               # outbox, inbox, syncEngine, conflictResolver, attachmentUploader, cursors
│   ├── stores/             # authStore, syncStore, locationStore
│   ├── hooks/              # useAuth, useSync, useOfflineStatus, useLocation
│   ├── components/         # ui/, forms/, map/, evidence/, sync/
│   ├── services/           # pushNotification, locationTracking, evidenceManager
│   └── utils/              # geo, format, idempotency (UUID v7)
├── eas.json                # EAS Build profiles (dev, preview, production)
└── app.json                # Expo config
```

### Offline-First Architecture

**WatermelonDB tables**: clientes, productos, pedidos, detalle_pedidos, visitas, rutas, ruta_detalles, cobros, attachments, outbox

Cada tabla tiene:
- `server_id` (nullable) — PK del servidor, null cuando creado offline
- `local_id` (UUID v7) — ID generado por el cliente, siempre presente
- `version` (int) — concurrencia optimista
- `sync_status`: 'synced' | 'pending' | 'conflict'

**Outbox/Inbox Pattern**:
1. PULL primero: `GET /api/mobile/sync/pull?since={cursor}` → inbox aplica a WatermelonDB
2. PUSH segundo: `POST /api/mobile/sync/push` → drena outbox queue (FIFO)
3. ATTACHMENTS tercero: `POST /api/mobile/attachments/upload` (multipart, deferred)

**Idempotencia**: UUID v7 como `local_id`, servidor lo usa como idempotency key.

**Conflictos**: server_wins por defecto. Conflicto guardado en `conflict_log`, usuario notificado con toast.

### Push Notifications (FCM/APNs)

| Tipo | Topic FCM | Deep Link |
|------|-----------|-----------|
| order.assigned | tenant.{id}.user.{id} | /pedidos/{id} |
| order.status_changed | tenant.{id}.user.{id} | /pedidos/{id} |
| route.published | tenant.{id}.user.{id} | /ruta |
| visit.reminder | tenant.{id}.user.{id} | /ruta/{paradaId} |
| sync.required | tenant.{id} | triggers background sync |
| announcement | tenant.{id} | notification center |
| system.maintenance | global | maintenance banner |

### Maps & Geolocation

- Cluster markers (supercluster), filtro por zona/categoria/status visita
- Route polyline, current stop + next stop con ETA
- Check-in por geocerca: captura GPS, compara vs lat/lng del cliente, warn si >200m
- Delegacion a Google Maps / Apple Maps / Waze para navegacion turn-by-turn

### Offline Attachments

- Types: fotos (evidencia entrega), firmas, recibos
- Capture → save local → Attachment record en WatermelonDB → upload queue separada
- Cada attachment tiene `eventType` + `eventLocalId` (correlacion con pedido/visita/cobro)
- Upload via multipart POST cuando online, servidor retorna URL

### Mobile Security

| Concern | Solution |
|---------|----------|
| Token storage | expo-secure-store (Keychain/EncryptedSharedPreferences) |
| Local DB encryption | WatermelonDB + SQLCipher (opcional) |
| Remote logout | DeviceSession.Status = RevokedByAdmin → 401 → clear local state |
| Biometric lock | expo-local-authentication (opcional) |

### Mobile CI/CD (EAS Build)

```bash
# Dev (physical device via USB)
cd apps/mobile-app && npx expo start --dev-client

# Preview build (APK + Ad Hoc)
eas build --platform all --profile preview

# Production + submit
eas build --platform all --profile production
eas submit --platform ios --profile production
eas submit --platform android --profile production

# OTA update (JS-only, skip store review)
eas update --channel production --message "Fix order total"
```

### Observability

- Sentry React Native: crashes, breadcrumbs, source maps
- Custom metrics: sync_duration_ms, sync_records_pushed, sync_conflicts
- MMKV counters: offline_orders_created, offline_duration_seconds

### Mobile Roadmap

| Phase | Scope | Duracion |
|-------|-------|----------|
| 1. Foundation | Auth, navigation, API client, screens basicas | 4 semanas |
| 2. Offline Core | WatermelonDB, outbox/inbox, sync engine | 3 semanas |
| 3. Route & Map | Ruta en mapa, clusters, check-in/out, tracking | 3 semanas |
| 4. Evidence & Payments | Fotos/firma, deferred upload, cobros | 2 semanas |
| 5. Push & Notifications | FCM, topics, deep links, notification center | 2 semanas |
| 6. Polish & Testing | Error boundaries, Sentry, E2E (Detox), performance | 2 semanas |
| 7. Store Release | EAS Submit, TestFlight beta, Play Internal, produccion | 1 semana |

---

## AI Add-on Strategy (apps/ai/)

### Packs Vendibles

| Pack | Features | Target | Rango MXN/mes |
|------|----------|--------|---------------|
| Ventas | Cross-sell, reorder predictions, visit priority, client scoring | Admin + Vendedor | $299-499 |
| Cobranza | Risk scoring, personalized collection messages, payment probability | Admin | $199-399 |
| Automatizacion | Visit summaries, semantic search, OCR de evidencia, daily digest | Admin + Vendedor | $249-449 |
| Inteligencia | Anomaly detection, sales forecasting, territory optimization | Admin | $399-699 |
| Todo-en-uno | Todos los packs | Admin | $899-1,499 (20% desc.) |

### Modelo de Creditos

```
1 credit = 1 AI request (varia por complejidad)

Costos por operacion:
  Simple (summary, classification)     = 1 credito
  Medium (recommendations, scoring)    = 2 creditos
  Complex (RAG search, OCR)            = 3 creditos
  Heavy (forecasting, batch analysis)  = 5 creditos

Asignaciones mensuales:
  Ventas: 500 | Cobranza: 300 | Automatizacion: 400
  Inteligencia: 200 | Todo-en-uno: 1,200

Sobrecargos: $0.50 MXN por credito adicional
Sin acumulacion (use it or lose it)
```

### Metricas Vendibles (ROI dashboard)

| Metrica | Como la IA la mejora |
|---------|---------------------|
| Ticket promedio | Cross-sell aumenta items por pedido |
| Cartera vencida | Risk scoring + mensajes automaticos reducen mora |
| Tiempo por visita | Auto-summaries + smart routing ahorran tiempo |
| Tasa de recompra | Reorder predictions disparan follow-ups oportunos |
| Anomalias detectadas | Detectar patrones inusuales antes de que sean perdidas |

### AI Architecture

```
Frontend/Mobile → /api/ai/* → AI Gateway → Auth+JWT → Rate Limiter → Router
                                              ↓
                                   ┌──────────┴──────────┐
                                   │                     │
                              LLM Call             Tool Call
                         (OpenAI/Azure)       (internal APIs)
                                   │                     │
                                   └──────────┬──────────┘
                                              │
                                     Vector Store (RAG)
                                     pgvector, partitioned
                                     by tenant_id
                                              │
                                     Usage Tracking + Audit
                                     AiUsage, AiCredits tables
```

### apps/ai/ Structure

```
apps/ai/src/HandySales.Ai.Api/
├── Endpoints/          # Summary, Recommendation, Collections, Document, Search, Usage
├── Middleware/          # RateLimit, CreditDeduction, FeatureFlag
├── Services/           # LlmRouter, ToolCallExecutor, RagService, CreditManager, ResponseCache
├── Configuration/
└── Program.cs
```

### Endpoints (Port 1053)

| Endpoint | Method | Creditos | Pack |
|----------|--------|----------|------|
| /api/ai/recommendations | POST | 2 | Ventas |
| /api/ai/visit-priority | POST | 2 | Ventas |
| /api/ai/client-score | POST | 2 | Ventas |
| /api/ai/collections-message | POST | 1 | Cobranza |
| /api/ai/collections-risk | POST | 2 | Cobranza |
| /api/ai/summary | POST | 1 | Automatizacion |
| /api/ai/search | POST | 3 | Automatizacion |
| /api/ai/document-extract | POST | 3 | Automatizacion |
| /api/ai/anomalies | POST | 5 | Inteligencia |
| /api/ai/forecast | POST | 5 | Inteligencia |
| /api/ai/usage | GET | 0 | All |

### Data Schema (tablas nuevas en handy_erp)

- `AiPlans` — definiciones de packs (nombre, slug, precio, creditos, features JSON)
- `AiSubscriptions` — suscripcion activa del tenant (tenant_id, plan_id, fecha_inicio)
- `AiCreditBalances` — creditos por tenant por mes (asignados, usados, extras)
- `AiUsage` — log por request (tenant, user, endpoint, model, tokens, costo, latency, cache_hit)
- `AiAuditLogs` — audit trail completo (accion, detalle JSON, IP)

### Security & Compliance

- **Aislamiento multi-tenant**: WHERE tenant_id en todo, vector store filtrado por metadata
- **JWT compartido**: misma clave que Main/Mobile APIs
- **Feature flags**: middleware verifica AiSubscriptions, 403 si no tiene pack
- **Rate limiting**: por tenant por minuto segun plan
- **Creditos**: middleware verifica balance, 402 si agotado
- **PII**: nunca enviar telefono/email/RFC al LLM, usar IDs anonymizados
- **Audit**: cada request logueado con tenant, user, endpoint, model, tokens, costo

### LLM Model Selection

| Tarea | Modelo | Razon |
|-------|--------|-------|
| Summaries, classifications | gpt-4o-mini | Rapido, barato, calidad suficiente |
| Recommendations, scoring | gpt-4o-mini | Buen razonamiento a bajo costo |
| RAG, anomaly detection | gpt-4o | Requiere reasoning mas fuerte |
| Embeddings | text-embedding-3-small | El mas barato, 1536 dims |
| OCR / documents | gpt-4o (vision) | Requiere input multimodal |

**Controles de costo**: caching de respuestas identicas (TTL 1h), model routing automatico, queue para OCR, limites de tokens por request.

### RAG por Tenant

- **Vector store**: pgvector en Railway PostgreSQL (~$5/mes)
- **Documentos indexados**: notas de visitas, notas de pedidos, descripciones de productos
- **Pipeline**: entity create/update → enqueue embedding → text-embedding-3-small → store vector + tenant_id metadata
- **Aislamiento**: MANDATORY filter por tenant_id en toda busqueda

### Tool Calling

- `get_client_info(clienteId)` → GET /api/clients/{id}
- `get_client_orders(clienteId, days)` → GET /api/orders?clienteId={id}
- `get_overdue_portfolio(tenantId)` → GET /api/cobranza/vencida
- Service-to-service JWT interno, hereda tenant_id del request original

### AI Roadmap

| Fase | Foco | Timeline |
|------|------|----------|
| 1. Quick Wins | /summary + /collections-message | 2-3 semanas |
| 2. Recommendations | /recommendations + /visit-priority + credit system | 3-4 semanas |
| 3. RAG & Search | pgvector + /search + /document-extract | 4-6 semanas |
| 4. Intelligence | /anomalies + /forecast + admin dashboard | 4-6 semanas |

### Cost Estimate

| Componente | Costo/mes |
|------------|-----------|
| AI Gateway container (Railway) | $5-10 |
| PostgreSQL pgvector (Railway) | $5-7 |
| OpenAI API (50 tenants avg) | $20-80 |
| Embeddings | $5-15 |
| **Total AI infra** | **$35-112** |
| **Revenue (10 tenants x $500 MXN)** | **~$280 USD** |

---

## Plan de Pantallas — Estado Actual (Feb 2026)

### Cambios recientes aplicados al código React
- **Modal → Drawer**: Todas las páginas con formularios ahora usan Drawer lateral (no modales centrales)
- **Iconos coloridos**: Todos los iconos de acción ahora tienen colores semánticos (Search=blue, Filter=violet, Export=emerald, Edit=amber, Delete=red, etc.)
- **Mobile cards**: Todas las páginas de lista tienen vista de tarjetas para pantallas pequeñas
- **AsNoTracking**: Agregado a 107 queries de lectura en 21 repositories
- **MySQL tuning**: InnoDB buffer pool, flush settings, connection pooling
- **Encoding fixes**: UTF-8 puro en frontend, charset=utf-8 en API, double-encoding corregido en BD
- **SignalR real-time**: Hub self-hosted con camelCase JSON, frontend context con auto-reconnect y subscriber registry
- **Anuncios sistema**: CRUD SuperAdmin, banners con gradientes por tipo/prioridad, animaciones suaves enter/exit, delivery instantáneo via SignalR
- **Maintenance mode**: Middleware que bloquea requests + toggle desde SuperAdmin con banner automático (shimmer + no-dismiss)
- **2FA/TOTP**: Endpoints backend + UI setup/disable en SecurityTab, TOTP encryption service
- **Session validation**: Middleware valida sesión activa, revocación remota de dispositivos

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

---

## Checklist Maestro de Pendientes (Feb 2026)

> Última actualización: 2026-02-20

### ✅ COMPLETADO — Seguridad (SEC-1 a SEC-6)

- [x] **SEC-1**: JWT validation habilitada (firma + lifetime en dev y prod) — `JwtExtensions.cs`
- [x] **SEC-2**: Secretos movidos a env vars (appsettings vaciados) — docker-compose + Railway
- [x] **SEC-3**: Token 30 min (prod) / 60 min (dev) + auto-refresh frontend via NextAuth
- [x] **SEC-4**: Tokens en httpOnly cookies (NextAuth) — legacy localStorage eliminado
- [x] **SEC-5**: Rate Limiting en `nginx.prod.conf` (100 req/s per IP, burst 20/10/50)
- [x] **SEC-6**: Secretos rotados — nuevo JWT base64 64 bytes, NEXTAUTH_SECRET rotado

### ✅ COMPLETADO — RBAC (Filtrado + Protección de rutas)

- [x] **RBAC-1**: Vendedor solo ve SUS clientes (vendedor_id = su id + NULL) — backend + frontend
- [x] **RBAC-2**: Vendedor solo ve SUS pedidos — backend `PedidoRepository` + frontend filter
- [x] **RBAC-3**: Vendedor solo ve SUS rutas — backend `RutaRepository` + frontend filter
- [x] **RBAC-4**: Visitas filtradas por usuario_id — `ClienteVisitaRepository`
- [x] **RBAC-5**: Entregas usan mismos endpoints de rutas/pedidos (ya filtrados)
- [x] **RBAC-6**: Dashboard vendedor personalizado ("Mi Rendimiento" con sus métricas reales)
- [x] **RBAC-7-10**: Middleware protege rutas por rol (`ROLE_RESTRICTED_ROUTES` + `ROUTE_PERMISSIONS` en `middleware.ts`)

### ✅ COMPLETADO — Real-time & Anuncios

- [x] **RT-1**: SignalR hub self-hosted (`NotificationHub`, `/hubs/notifications`) — camelCase JSON via `AddJsonProtocol`
- [x] **RT-2**: SignalR frontend context (`SignalRContext`) — subscriber registry, auto-reconnect, connection status
- [x] **RT-3**: Real-time notifications push (`useNotifications` hook, PascalCase-safe handlers)
- [x] **RT-4**: Announcement system CRUD — entity `Announcement` + `AnnouncementDismissal`, endpoints SuperAdmin only
- [x] **RT-5**: Announcement banners — gradient styles per tipo/prioridad (Maintenance=amber, Critical=red, High=yellow, Broadcast=teal, Banner=blue), smooth enter/exit CSS animations
- [x] **RT-6**: Real-time banner delivery — optimistic SignalR payload construction (no HTTP roundtrip), instant render <100ms
- [x] **RT-7**: Maintenance mode — `MaintenanceMiddleware` + `SessionValidationMiddleware`, GlobalSettings toggle, auto-banner con shimmer
- [x] **RT-8**: 2FA/TOTP — `TwoFactorEndpoints`, `TotpEncryptionService`, `TwoFactorSetup`/`TwoFactorDisable` components en SecurityTab

### ✅ COMPLETADO — Pantallas SuperAdmin

- [x] **SA-1**: Gestión de tenants (`/admin/tenants`) — CRUD completo, batch ops, detalle con stats + users
- [x] **SA-2**: ~~Tenant switcher en header~~ DESCARTADO — impersonation cubre este caso
- [x] **SA-3**: Dashboard sistema (`/admin/system-dashboard`) — 4 KPIs, top tenants, recientes
- [x] **SA-4**: ImpersonationModal integrado en header/user menu — botón "Impersonar Empresa" para SuperAdmin

### 🟠 ALTA — Funcionalidad incompleta

- [x] **FUNC-1**: ~~`deliveries.ts` usa MOCK data~~ — API real a `/rutas` y `/pedidos`, 12 métodos
- [ ] **FUNC-2**: Firebase FCM simulado (`FcmService.cs` retorna mocks) — pausado hasta versión móvil
- [x] **FUNC-3**: ~~Error Boundary global~~ — `error.tsx` (root + dashboard) + `not-found.tsx` con UI en español
- [x] **FUNC-4**: ~~Módulo Rutas Admin incompleto~~ — 8 páginas funcionales (list, manage, detail, admin, load, close)
- [x] **FUNC-5**: ~~`subscription/page.tsx` mock data~~ — conectado a `useCompany()` (CompanySettings API real)
- [ ] **FUNC-6**: Auto-seeding para nuevos tenants — al crear tenant/empresa, generar datos demo mínimos (categorías, productos ejemplo, cliente ejemplo, lista de precios) para onboarding inmediato

### 🟡 MEDIA — Mejoras de infraestructura

- [x] **INFRA-CI**: CI/CD pipeline (GitHub Actions + Railway auto-deploy + Vercel auto-deploy)
- [x] **INFRA-DEPLOY**: Producción desplegada (Railway APIs + Vercel frontend + MySQL)
- [x] **INFRA-1**: ~~EF Core Migrations~~ — baseline generado, `DatabaseMigrator` con advisory lock, auto-apply en dev, `efbundle` en CI/CD
- [ ] **INFRA-2**: Soft deletes (GDPR compliance)
- [ ] **INFRA-3**: Integration tests (parcial: rbac, security, visual-audit existen)
- [ ] **INFRA-4**: 12 pantallas React sin diseño Pencil (listadas arriba)

### 🟡 MEDIA — Rol Supervisor

- [ ] **SUP-1**: Implementar sidebar/permisos para SUPERVISOR (enum existe, no se usa)
- [ ] **SUP-2**: Dashboard de equipo para supervisor
- [ ] **SUP-3**: Vista de rendimiento por subordinado

### 🟢 BAJA — Futuro

- [ ] **FUT-1**: App móvil React Native (7 fases) — ver sección "React Native Mobile App" abajo
- [ ] **FUT-2**: Billing API deploy en producción
- [ ] **FUT-3**: Migración a Azure (cuando 1,000+ users) — `AZURE_MIGRATION.md`
- [ ] **FUT-4**: Custom domain (`app.handysales.com`)
- [x] **FUT-5**: ~~Impersonation feature completa~~ — modal + banner + audit trail + session timeout implementado
- [x] **FUT-6**: ~~2FA/MFA~~ TOTP implementado (endpoints + UI setup/disable en SecurityTab)
- [x] **FUT-7**: ~~WebSocket para actualizaciones real-time~~ SignalR self-hosted implementado
- [ ] **FUT-8**: Offline support
- [ ] **FUT-9**: Password Reset page
- [ ] **FUT-10**: Rol VIEWER funcional

### ✅ COMPLETADO — Announcements DisplayMode

> Desacoplado el "dónde se muestra" del "tipo de anuncio". Al crear un anuncio, el SuperAdmin elige destino: Banner bar, Notificación (campana), o Ambos.

- [x] **ANN-1**: Backend — Enum `AnnouncementDisplayMode` (Banner/Notification/Both) + migración SQL `16_announcement_display_mode.sql`
- [x] **ANN-2**: Backend — Al crear anuncio con DisplayMode=Notification|Both → crea `NotificationHistory` + push SignalR `ReceiveNotification`
- [x] **ANN-3**: Backend — Endpoint banners filtra `DisplayMode IN (Banner, Both)`, SignalR handler frontend filtra igual
- [x] **ANN-4**: Frontend — SignalR `AnnouncementCreated` respeta DisplayMode (skip banner list si Notification-only)
- [x] **ANN-5**: Frontend — Admin UI: selector de 3 botones (Banner/Notificación/Ambos) con iconos en drawer de creación
- [x] **ANN-6**: Maintenance siempre forzado a DisplayMode=Banner (backend + frontend oculta selector)

### 🟢 BAJA — AI Add-on

- [ ] **AI-1**: AI Gateway microservice setup (apps/ai/, Docker, port 1053)
- [ ] **AI-2**: AI schema migration (AiPlans, AiSubscriptions, AiCreditBalances, AiUsage, AiAuditLogs)
- [ ] **AI-3**: Phase 1 — /api/ai/summary + /api/ai/collections-message
- [ ] **AI-4**: Credit system + usage tracking middleware
- [ ] **AI-5**: Phase 2 — /api/ai/recommendations + /api/ai/visit-priority
- [ ] **AI-6**: Phase 3 — pgvector + /api/ai/search (RAG)
- [ ] **AI-7**: Phase 4 — /api/ai/anomalies + /api/ai/forecast
- [ ] **AI-8**: Admin AI usage dashboard
- [ ] **AI-9**: Mobile AI integration
