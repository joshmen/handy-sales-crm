# HandySales - Project Context

> **MANDATORY**: The following workflow rules are non-negotiable and override all other behavior.

## Workflow Orchestration

### 1. Plan-First Mode (Default)
- Enter planning mode for ANY non-trivial task (more than 3 steps or architectural decisions)
- If something goes wrong, STOP and go back to planning immediately; don't keep forcing
- Use planning mode for verification steps, not just for building
- Write detailed specifications upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents frequently to keep the main context window clean
- Delegate research, exploration, and parallel analysis to subagents
- For complex problems, dedicate more compute via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY user correction: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Iterate relentlessly on these lessons until the error rate drops
- Review lessons at session start for the corresponding project

### 4. Verify Before Completing
- Never mark a task as completed without proving it works
- Compare the diff of behavior between the main branch and your changes when relevant
- Ask yourself: "Would a Staff Engineer approve this?"
- Run tests, check the logs, and demonstrate correctness of the code

### 5. Demand Elegance (Balance)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix looks hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes; don't over-engineer
- Question your own work before presenting it

### 6. Autonomous Error Correction
- When you receive an error report: just fix it. Don't ask to be hand-held
- Identify logs, errors, or failing tests and then resolve them
- Zero need for context-switching from the user
- Go fix CI tests that fail without being told how

## Task Management

1. **Plan First**: Write the plan in `tasks/todo.md` with verifiable items
2. **Verify Plan**: Confirm before starting implementation
3. **Track Progress**: Mark items as completed as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add a review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Fundamental Principles

- **Simplicity First**: Make each change as simple as possible. Touch the minimum code necessary.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimum Impact**: Changes should only touch what's necessary. Avoid introducing errors.

---

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

### CRITICAL: Frontend Dev Server Rules (for AI agents)

1. **NEVER delete `apps/web/.next/`** while the dev server is running. This corrupts the server and it will return 500 for ALL pages. The server process becomes a zombie that's hard to kill.

2. **NEVER run `rm -rf .next`** as a troubleshooting step. If needed, stop the server FIRST, then delete, then restart.

3. **The user runs the dev server from their own terminal** (VSCode or separate shell). AI agents cannot see or kill this process reliably via `taskkill /im node.exe` because `netstat` sometimes doesn't show it on Windows.

4. **To find and kill processes on Windows port 1083**, use PowerShell (netstat often fails silently):
   ```powershell
   # Find PID
   powershell.exe -Command "Get-NetTCPConnection -LocalPort 1083 | Select-Object OwningProcess"
   # Kill it
   powershell.exe -Command "Stop-Process -Id <PID> -Force"
   ```

5. **If the server is returning 500 and you can't fix it**, tell the user to restart it manually: `Ctrl+C` then `cd apps/web && npm run dev`

6. **Multiple agents warning**: Other Claude agents may be running on this project simultaneously. Do NOT kill all node.exe processes — this will break other agents' servers and tools.

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
- **MANDATORY — Entity creation rules**: Every new domain entity MUST:
  1. **Inherit `AuditableEntity`** (`libs/HandySales.Domain/Common/AuditableEntity.cs`) — this provides `Activo`, `CreadoEn`, `ActualizadoEn`, `CreadoPor`, `ActualizadoPor`, `EliminadoEn`, `EliminadoPor`, `Version`
  2. **Have a global query filter** in `HandySalesDbContext.OnModelCreating` that includes `e.EliminadoEn == null` to exclude soft-deleted records. If the entity has `TenantId`, combine both: `e => (!ShouldApplyTenantFilter || e.TenantId == CurrentTenantId) && e.EliminadoEn == null`
  3. **Use `.Remove()` for deletes** — the `SaveChangesAsync` override automatically converts hard deletes to soft deletes (sets `EliminadoEn` + `EliminadoPor`). No manual soft-delete logic needed in repositories
  4. **Never hard-delete** an `AuditableEntity` — if a true physical delete is needed (e.g., join tables, tokens), the entity should NOT inherit `AuditableEntity`

## Git Workflow Rules

- **NEVER push automatically.** Always test locally first. Only push when the user explicitly requests it.
- Commits are fine without asking, but `git push` requires explicit user instruction.
- **Before ANY push**, present a **Pre-Push Deployment Checklist** to the user:
  1. **New env vars**: List ALL new environment variables needed in Railway/Vercel/Azure with exact names, where to set them, and whether they're required or optional
  2. **DB migrations**: List new EF Core migrations that will auto-apply in production (name, what they change)
  3. **CI/CD pipeline changes**: Any modifications needed to `.github/workflows/deploy-apis.yml` or Vercel config
  4. **Azure Bicep/docs updates**: If new services, env vars, or infra changes affect future Azure migration
  5. **Schema base update**: Whether `01_init_schema_multitenant.sql` needs updating for fresh deployments
  6. **Breaking changes**: Any API contract changes that affect frontend/mobile/billing
  - Only proceed with push after user reviews and confirms the checklist
- **CRITICAL — Env vars notification**: After ANY commit that introduces new `process.env.*`, `Environment.GetEnvironmentVariable(...)`, or `IConfiguration["..."]` references, you MUST immediately tell the user which variables need to be added to which platform (Vercel/Railway/Azure) BEFORE they can push. Format as a clear table with: Variable Name | Platform | Required/Optional | Description. The user MUST add these manually in the provider dashboards before deploying.

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
SOCIAL_LOGIN_SECRET=<must match JWT__SecretKey on Railway>
GOOGLE_CLIENT_ID=<from Google Cloud Console>              # Optional — enables Google OAuth
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>           # Optional — enables Google OAuth
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
SENDGRID_API_KEY=<from SendGrid dashboard>
SENDGRID_FROM_EMAIL=<verified sender, e.g. noreply@handysuites.com>
SENDGRID_FROM_NAME=Handy Suites
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

**IMPORTANT — Shell PATH fix**: `dotnet ef` is installed as a global tool but `.dotnet/tools` is NOT in the bash PATH. Always prefix commands with the PATH export:
```bash
export PATH="$PATH:/c/Users/AW AREA 51M R2/.dotnet/tools"
```

```bash
# Generate a new migration after changing entities/DbContext
export PATH="$PATH:/c/Users/AW AREA 51M R2/.dotnet/tools"
dotnet-ef migrations add DescripcionDelCambio \
  --project libs/HandySales.Infrastructure \
  --startup-project apps/api/src/HandySales.Api \
  --output-dir Migrations

# Apply locally (also auto-applies on Main API startup in dev)
docker-compose -f docker-compose.dev.yml up -d --build api_main

# Revert last migration (if not yet applied)
dotnet-ef migrations remove \
  --project libs/HandySales.Infrastructure \
  --startup-project apps/api/src/HandySales.Api

# List migrations and their status
dotnet-ef migrations list \
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
- **MANDATORY**: When modifying ANY entity (Domain), DbContext mapping, or adding/removing columns, you MUST generate a new EF Core migration BEFORE committing:
  ```bash
  export PATH="$PATH:/c/Users/AW AREA 51M R2/.dotnet/tools"
  dotnet-ef migrations add NombreDescriptivo \
    --project libs/HandySales.Infrastructure \
    --startup-project apps/api/src/HandySales.Api \
    --output-dir Migrations
  ```
  Then rebuild the API container (`docker-compose -f docker-compose.dev.yml up -d --build api_main`) to verify the migration applies cleanly. Never commit DB schema changes without the corresponding migration files.

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

### Análisis Competitivo Mobile (Feb 2026)

Analizamos 31 screenshots de **Handy** (handy.la, v1.4238) + 15 competidores (VentaRuta, Microsip, EVC PRO, CPG Soft, Pepperi, FieldAssist). Mercado: $201M USD (2023), 8.9% CAGR → $367M en 2030. 1.1M+ tienditas en México.

**Gaps del mercado (nadie los tiene)**:
- SaaS self-service (todos requieren llamar a ventas)
- AI inteligente (solo players internacionales de India)
- WhatsApp pedidos tiendita (futuro — tendero hace su pedido por chatbot)
- Gamificación (leaderboards, badges)

**Nuestra diferenciación**:
- **Tab "Cobrar" dedicado** — Handy lo esconde en sub-sección 9 de 13
- **Tab "Más"** como menú — no desperdiciamos tab en solo Perfil
- **Mapa inteligente** — pines color semántico (verde/amarillo/rojo/azul), ruta polyline
- **Push notifications (FCM)** para vendedores (no WhatsApp)
- **CFDI integrado** via Billing API

**Navegación 5 tabs**: Hoy / Mapa / Vender / Cobrar / Más (Clientes, Perfil, Sync, Config en Más)

### Mobile Roadmap (Actualizado — basado en análisis competitivo)

| Phase | Scope | Pantallas | Backend |
|-------|-------|-----------|---------|
| 1. Foundation (MOB-1) ✅ | Auth, navigation, API client, lectura básica | 9 | 0 |
| 2. Vender (MOB-2) | Catálogo productos, crear/editar pedidos, tab Vender | 5 | 0 |
| 3. Ruta + Visitas (MOB-3) | Check-in/out GPS, paradas, resumen diario | 5 | 0 |
| 4. Cobrar (MOB-4) | Cobranza, saldos, estado cuenta, tab Cobrar | 4 | 5 endpoints |
| 5. Mapa + Clientes (MOB-5) | Tab Mapa inteligente, CRUD clientes, GPS | 4 | 5 endpoints |
| 6. Polish (MOB-6) | Escáner, fotos, onboarding, calendario, timeline | 6 features | 1 endpoint |
| 7+ Future (MOB-7) | Liquidación, FCM, AI, gamificación, offline, WhatsApp tienditas | — | — |

> Plan completo en `memory/plan-mobile-roadmap.md`

### Diseño Pencil Mobile

Archivo: `docs/design/pencil/pencil-mobile.pen` — 31 frames cubriendo todas las pantallas móviles

| Grupo | Frames | Contenido |
|-------|--------|-----------|
| Auth | 1-2 | Login, Forgot Password |
| MOB-1 | 3-9 | Tab Hoy, Clientes, Cliente Detalle, Pedidos, Pedido Detalle, Tab Más, Perfil |
| MOB-2 Vender | 10-13 | Tab Vender, Crear Pedido (3 pasos) |
| MOB-3 Ruta | 14-17 | Ruta del Día, Detalle Parada, Visita Activa, Resumen Diario |
| MOB-4 Cobrar | 18-21 | Tab Cobrar, Estado Cuenta, Registrar Cobro, Historial |
| MOB-5 Mapa | 22-24 | Tab Mapa, Crear Cliente, Cliente Seleccionado |
| MOB-6 Polish | 25-28 | Onboarding (3), Escáner |
| Estados | 29-31 | Empty States, Loading States, Component Library |

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
- **Rebranding → Handy Suites®**: Nombre cambiado de HandyCRM/HandySales a "Handy Suites" en toda la app, BD, y assets
- **Landing page** (`/`): Página pública con 9 secciones (hero, features, pricing, testimonios, footer). Server Component con SEO metadata. Antes era redirect a `/dashboard`
- **Login split layout** (`/login`): Panel izquierdo con imagen vendedor de ruta (AI-generated) + gradient overlay + value props (CheckCircle) + pills App Store/Google Play a color. Panel derecho con form limpio sobre fondo blanco. `AuthLayout` reutilizable en login, forgot-password, reset-password. Responsive: panel izquierdo oculto en mobile
- **Forgot/Reset password pages**: `/forgot-password` y `/reset-password` con AuthLayout compartido
- **LandingNav**: Componente sticky con scroll awareness, mobile hamburger, links a secciones + CTA "Comienza gratis"
- **Logo SVGs**: `logo-icon.svg` (4 cuadros multicolor con iconos), `logo.svg`, `logo-dark.svg`, `logo-transparent.svg`
- **Favicon**: 4 cuadros de colores (rose/indigo/green/amber) — mismos gradientes que logo-icon.svg, sin iconos internos para nitidez a 16x16
- **Logo workflow rule**: When creating or updating logos, ALWAYS generate proper SVG files with transparency. Create multiple versions:
  - `logo.svg` — Full logo (brand colors, white/light background assumed)
  - `logo-dark.svg` — Logo for dark backgrounds (inverted text/fills)
  - `logo-transparent.svg` — Logo with fully transparent background (no background rect)
  - `logo-icon.svg` — Icon-only version (square, for favicons/app icons)
  - `favicon.svg` — Simplified version optimized for 16x16 rendering
  All SVGs must use transparent backgrounds by default (no opaque `<rect>` fills). Saved in `apps/web/public/`.
- **Tour screenshots**: Capturados via Playwright desde las páginas reales (`public/images/tour/`), usados en landing page product showcase
- **Hero dashboard screenshot**: `public/images/hero-dashboard.png` — capturado via Playwright del dashboard real de Jeyma

### Recuento React vs Pencil

| Categoría | Cantidad |
|-----------|----------|
| Pantallas React totales | 47 |
| Pantallas Pencil totales | 49 frames |
| Match React↔Pencil | 43 (todas necesitan actualización) |
| En React pero NO en Pencil | 10 (faltantes, login + forgot/reset completados) |
| En Pencil pero NO en React | 3 (features futuras) |

### 10 Pantallas React SIN diseño Pencil

| # | Página | Prioridad |
|---|--------|-----------|
| ~~1~~ | ~~`login/page.tsx`~~ | ~~ALTA~~ ✅ Rediseñado (split layout con vendedor + AuthLayout reutilizable) |
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
- ~~deliveries.ts~~ ✅ Conectado a API real (`/rutas` + `/pedidos`, 12 métodos)

**Stores Zustand faltantes:** No son críticos — los hooks `usePaginated{Entity}` cubren la funcionalidad.

**Features que implican pantallas nuevas:**
- ~~Error Boundary global~~ ✅ Implementado (`error.tsx` root + dashboard + `not-found.tsx`)
- ~~Password Reset page~~ ✅ Implementado (`/forgot-password` + `/reset-password` con AuthLayout)
- ~~2FA/MFA tab en Profile/Settings~~ ✅ Implementado (SecurityTab con TwoFactorSetup/TwoFactorDisable)
- Email Verification page — BAJA

### Archivos Pencil

```
docs/design/pencil/pencil-new.pen        # 49 frames (principal)
docs/design/pencil/pencil-superadmin.pen  # Mismo contenido
docs/design/pencil/pencil-admin.pen       # Mismo contenido
```

### Próximos pasos de diseño
1. **Fase A**: Actualizar 43 frames existentes (iconos coloridos + Modal→Drawer)
2. **Fase B**: Crear 10 pantallas faltantes en Pencil (login y forgot/reset ya completados)

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
- [x] **FUNC-2**: ~~Firebase FCM simulado~~ — movido a BAJA (depende de app móvil FUT-1)
- [x] **FUNC-3**: ~~Error Boundary global~~ — `error.tsx` (root + dashboard) + `not-found.tsx` con UI en español
- [x] **FUNC-4**: ~~Módulo Rutas Admin incompleto~~ — 8 páginas funcionales (list, manage, detail, admin, load, close)
- [x] **FUNC-5**: ~~`subscription/page.tsx` mock data~~ — conectado a `useCompany()` (CompanySettings API real)
- [x] **FUNC-6**: ~~Auto-seeding para nuevos tenants~~ — `TenantSeedService` genera zonas, categorías, productos, clientes y lista de precios demo al crear tenant

### 🟡 MEDIA — Mejoras de infraestructura

- [x] **INFRA-CI**: CI/CD pipeline (GitHub Actions + Railway auto-deploy + Vercel auto-deploy)
- [x] **INFRA-DEPLOY**: Producción desplegada (Railway APIs + Vercel frontend + MySQL)
- [x] **INFRA-1**: ~~EF Core Migrations~~ — baseline generado, `DatabaseMigrator` con advisory lock, auto-apply en dev, `efbundle` en CI/CD
- [x] **INFRA-2**: ~~Soft deletes (GDPR compliance)~~ — `SaveChangesAsync` override, `EliminadoEn`/`EliminadoPor` en 30 entidades, query filters actualizados

### 🟡 EN PROGRESO — App Móvil React Native

- [x] **MOB-1**: ~~Foundation~~ — Auth, navigation, API client, 38 screens, 5 tabs, Maestro E2E passing
- [x] **MOB-2**: ~~Offline Core~~ — WatermelonDB 8 tablas, sync engine 3-phase (pull/push/attachments), outbox/inbox, MMKV cursors
- [x] **MOB-3**: ~~Route & Map~~ — react-native-maps + clustering + polylines, GPS check-in 200m geofence, location tracking, 7 map components
- [x] **MOB-4**: ~~Evidence & Payments~~ — Fotos/firma en visita-activa, foto comprobante en cobrar, JWT upload, sync Phase 3, pending count en sync screen
- [x] **MOB-5**: ~~Push & Notifications~~ — Expo Push API funcional (device-token, send, test endpoints), canales Android, deep links. Deployed to Railway
- [ ] **MOB-6**: Polish & Testing — Error boundaries, Sentry, E2E (Detox), performance (2 sem)
- [ ] **MOB-7**: Store Release — EAS Submit, TestFlight beta, Play Internal, producción (1 sem)

### 🟢 BAJA — Futuro

- [ ] **FUT-2**: Billing API deploy en producción
- [ ] **FUT-3**: Migración a Azure (cuando 1,000+ users) — `AZURE_MIGRATION.md`
- [ ] **FUT-4**: Custom domain (`app.handysales.com`)
- [x] **FUT-5**: ~~Impersonation feature completa~~ — modal + banner + audit trail + session timeout implementado
- [x] **FUT-6**: ~~2FA/MFA~~ TOTP implementado (endpoints + UI setup/disable en SecurityTab)
- [x] **FUT-7**: ~~WebSocket para actualizaciones real-time~~ SignalR self-hosted implementado
- [x] **FUT-9**: ~~Password Reset page~~ — `/forgot-password` + `/reset-password` con AuthLayout compartido
- [ ] **FUT-10**: Rol VIEWER funcional
- [ ] **SUP-1**: Implementar sidebar/permisos para SUPERVISOR — esperar demanda real
- [ ] **SUP-2**: Dashboard de equipo para supervisor
- [ ] **SUP-3**: Vista de rendimiento por subordinado
- [ ] **INFRA-3**: Integration tests (parcial: rbac, security, visual-audit existen)
- [ ] **INFRA-4**: 11 pantallas React sin diseño Pencil (diseño cuando se necesite)
- [ ] **INFRA-5**: Message broker (Redis Streams) + Push Worker directo a FCM/APNs — reemplazar Expo Push API como intermediario cuando escala lo requiera
- [ ] **RT-9**: SignalR real-time desde mobile sync → web backoffice — Al recibir push de sync móvil (cobros, pedidos, visitas), disparar evento SignalR al grupo del tenant para que el admin vea los datos entrar en vivo sin refrescar (CobroRecibido, PedidoCreado, VisitaRegistrada)

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

---

## Checklist Accionable — Sprint Actual (Feb 24, 2026)

> Última actualización: 2026-02-24. Ejecutar en orden de arriba a abajo.

### ✅ Paso 1: Commit pendientes — COMPLETADO

- [x] **GIT-1**: Commit Mobile API (attachment endpoint + sync service) — `8310b17`
- [x] **GIT-2**: Commit Mobile App (74 files: offline hooks, map, WDB, Maestro, TS fix) — `a6b771b`
- [x] **GIT-3**: TypeScript 0 errores confirmado (TS 5.6.3)
- [x] **Security**: Firebase files removidos de git, Google Maps key movida a env var — `d77dfa2`

### ✅ Paso 2: MOB-4 — Evidencia conectada a pantallas — COMPLETADO

> Todo ya estaba implementado. Solo faltaban botones de navegación en cobrar/index.tsx.

- [x] **MOB-4a**: `visita-activa.tsx` — Fotos (PhotoEvidence) + firma (SignatureCapture) + selector resultado (4 opciones) + notas
- [x] **MOB-4b**: `cobrar/registrar.tsx` — Foto comprobante (capturePhoto + saveAttachmentRecord)
- [x] **MOB-4c**: `evidenceManager.ts` — JWT auth header via `getAccessToken()` + Bearer
- [x] **MOB-4d**: `syncEngine.ts` — `uploadPendingAttachments()` + `cleanUploadedFiles()` como Phase 3
- [x] **MOB-4e**: `sync.tsx` — "Fotos pendientes de subir: N" con `usePendingAttachmentCount`
- [x] **MOB-4f**: Fix: botones "Registrar Cobro" + "Historial" en cobrar tab — `bf31409`

### ✅ Paso 3: Maestro E2E — Testing manual por usuario

- [x] **E2E-1/2/3**: Testing móvil se hace manualmente desde dispositivo físico (no automatizable por Claude)

### ✅ Paso 4: Web — Limpiar mocks — COMPLETADO

- [x] **WEB-1**: `profile/page.tsx` — Mocks reemplazados por `deviceSessionService.getMisSesiones()` + `dashboardService.getRecentActivity()`
- [x] **WEB-3**: Eliminados stubs mock `apps/web/src/app/api/mobile/{sync,auth}/route.ts` + middleware dead code
- [x] **WEB-2**: ~~68 E2E tests fallando~~ → 210/211 passing (1 flaky maintenance test — BAJA prioridad)

### 🟡 Paso 5: MOB-6 — Polish

- [ ] **MOB-6a**: Sentry React Native setup (crash reporting + source maps)
- [ ] **MOB-6b**: Error boundaries en cada tab/screen group
- [ ] **MOB-6c**: Zod validation en API responses (robustez)
- [ ] **MOB-6d**: Session timeout por inactividad
- [ ] **MOB-6e**: Performance audit (FlatList optimization, image caching)

### 🟢 Paso 6: Billing API — Completar para facturación real

- [ ] **BILL-1**: Conectar PAC real para timbrado CFDI (reemplazar mock)
- [ ] **BILL-2**: Generación PDF real (reemplazar stub)
- [ ] **BILL-3**: Envío de facturas por email (SendGrid integration)
- [ ] **BILL-4**: Fix passwords plaintext → BCrypt

### 🟢 Paso 7: MOB-7 — Store Release

- [ ] **MOB-7a**: EAS Build production profile (iOS + Android)
- [ ] **MOB-7b**: TestFlight beta submission
- [ ] **MOB-7c**: Play Internal testing track
- [ ] **MOB-7d**: App Store / Play Store metadata, screenshots, descriptions
- [ ] **MOB-7e**: Production release

### 🟢 Paso 8: Seguridad móvil avanzada (post-launch)

- [ ] **SEC-M1**: SQLCipher para encripción WatermelonDB
- [ ] **SEC-M2**: Biometric auth (expo-local-authentication)
- [ ] **SEC-M3**: Certificate pinning
- [ ] **SEC-M4**: Root/jailbreak detection

---

## 🔵 PENDIENTE — Marketplace de Integraciones + Facturación SAT (INT)

> **Modelo de negocio**: Add-on permanente (pago único). La facturación es la primera integración disponible.
> **Arquitectura**: Marketplace extensible donde futuros add-ons (WhatsApp, Maps, Pagos) se agregan dinámicamente.
> **PAC**: Diferido — por ahora solo la arquitectura; integración con PAC real en fase posterior.

### Lo que YA existe (Billing API)

| Componente | Estado | Ubicación |
|-----------|--------|-----------|
| Billing API (.NET 9, port 1051) | Funcional, 23 endpoints | `apps/billing/` |
| DB `handy_billing` | 11 tablas + SP + views | `infra/database/schema/BillingSchema.sql` |
| FacturasController | List, Create, Timbrar, Cancelar, PDF, XML, Enviar | `apps/billing/.../Controllers/FacturasController.cs` |
| CatalogosController | Tipos, Métodos, Formas pago, Usos CFDI, Config fiscal, Certificados | `apps/billing/.../Controllers/CatalogosController.cs` |
| ReportesController | Dashboard, ventas/periodo, top clientes, estados, auditoría | `apps/billing/.../Controllers/ReportesController.cs` |
| Docker dev + prod | Configurado | `infra/docker/Dockerfile.Billing.Dev/Prod` |
| BillingTab frontend | PLACEHOLDER ("próximamente") | `settings/components/BillingTab.tsx` |
| PAC real / PDF real | NO — UUID simulado, PDF placeholder | Diferido a fase futura |

### INT Fase 1: Backend — Entidades + Endpoints (Main API, port 1050)

#### Nuevas entidades en `libs/HandySales.Domain/Entities/`

- [ ] **INT-1**: Crear `Integration.cs` — Catálogo platform-level (SIN tenant_id, SIN AuditableEntity)
  - Campos: `Id`, `Slug` (unique, max 50), `Nombre` (max 100), `Descripcion` (max 500), `DescripcionCorta` (max 200)
  - `Icono` (nombre Phosphor icon, e.g. "Receipt"), `Categoria` (max 50: "Facturacion"/"Comunicacion"/"Mapas"/"Pagos")
  - `TipoPrecio` (max 20: "PERMANENTE"/"MENSUAL"/"GRATIS"), `PrecioMXN` (decimal), `PrecioSetupMXN` (decimal)
  - `RequiereConfiguracion` (bool), `Estado` (max 20: "DISPONIBLE"/"PROXIMO"/"DESCONTINUADO")
  - `Orden` (int), `Version` (max 20), `CreatedAt`, `UpdatedAt`
  - Navigation: `ICollection<TenantIntegration> TenantIntegrations`

- [ ] **INT-2**: Crear `TenantIntegration.cs` — Activación por tenant (CON tenant_id)
  - Campos: `Id`, `TenantId`, `IntegrationId`, `Estado` (ACTIVA/SUSPENDIDA/CANCELADA)
  - `FechaActivacion`, `FechaCancelacion`, `ActivadoPor` (FK Usuario)
  - `ConfiguracionJson` (string nullable, JSON flexible), `Notas` (max 500)
  - `CreatedAt`, `UpdatedAt`
  - Index único compuesto: `(TenantId, IntegrationId)`
  - Navigation: `Tenant`, `Integration`, `ActivadoPorUsuario`

- [ ] **INT-3**: Crear `IntegrationLog.cs` — Auditoría (CON tenant_id)
  - Campos: `Id` (long), `TenantId`, `IntegrationId`, `Accion` (ACTIVAR/DESACTIVAR/CONFIGURAR/ERROR)
  - `Descripcion` (max 500), `UsuarioId`, `CreatedAt`

- [ ] **INT-4**: Registrar en `HandySalesDbContext.cs`
  - Agregar 3 DbSets: `Integrations`, `TenantIntegrations`, `IntegrationLogs`
  - `Integration` NO tiene global query filter de tenant (es catálogo global)
  - `TenantIntegration` y `IntegrationLog` SÍ tienen tenant filter + `EliminadoEn == null` si aplica
  - Configurar unique index `(TenantId, IntegrationId)` en OnModelCreating

- [ ] **INT-5**: Generar EF Core migration `AddIntegrationsMarketplace`
  ```bash
  export PATH="$PATH:/c/Users/AW AREA 51M R2/.dotnet/tools"
  dotnet-ef migrations add AddIntegrationsMarketplace \
    --project libs/HandySales.Infrastructure \
    --startup-project apps/api/src/HandySales.Api \
    --output-dir Migrations
  ```

- [ ] **INT-6**: Crear seed SQL `infra/database/schema/07_integrations_seed.sql`
  ```sql
  INSERT INTO Integrations (slug, nombre, descripcion, descripcion_corta, icono, categoria,
    tipo_precio, precio_mxn, precio_setup_mxn, requiere_configuracion, estado, orden, version)
  VALUES ('facturacion-sat', 'Facturación SAT (CFDI 4.0)',
    'Genera facturas electrónicas con validez fiscal ante el SAT. Incluye timbrado, cancelación, envío por correo, generación de PDF/XML y reportes.',
    'Facturación electrónica CFDI 4.0 con timbrado SAT',
    'Receipt', 'Facturacion', 'PERMANENTE', 1499.00, 0.00, true, 'DISPONIBLE', 1, '1.0.0');
  -- Próximas (solo visual, no activables)
  INSERT INTO Integrations (slug, nombre, descripcion_corta, icono, categoria, tipo_precio, precio_mxn, estado, orden)
  VALUES
    ('whatsapp-business', 'WhatsApp Business', 'Mensajes y notificaciones a clientes por WhatsApp', 'WhatsappLogo', 'Comunicacion', 'MENSUAL', 299.00, 'PROXIMO', 2),
    ('google-maps-avanzado', 'Google Maps Avanzado', 'Optimización de rutas y tracking en tiempo real', 'MapPin', 'Mapas', 'MENSUAL', 199.00, 'PROXIMO', 3),
    ('pagos-en-linea', 'Pagos en Línea', 'Cobros con tarjeta, SPEI y CoDi', 'CreditCard', 'Pagos', 'MENSUAL', 399.00, 'PROXIMO', 4);
  ```

- [ ] **INT-7**: Crear Application layer
  - `libs/HandySales.Application/Integrations/IntegrationDtos.cs` — DTOs: IntegrationCatalogDto, TenantIntegrationDto, ActivarIntegrationRequest
  - `libs/HandySales.Application/Integrations/IIntegrationRepository.cs` — Interface repository
  - `libs/HandySales.Application/Integrations/IntegrationService.cs` — Business logic

- [ ] **INT-8**: Crear Repository `libs/HandySales.Infrastructure/Repositories/IntegrationRepository.cs`
  - GetAllAsync() — todos del catálogo + flag `activada` para tenant actual
  - GetBySlugAsync(slug) — detalle con info de activación
  - GetTenantIntegrationsAsync(tenantId) — solo activas del tenant
  - ActivarAsync(tenantId, integrationId, userId) — crear TenantIntegration + IntegrationLog
  - DesactivarAsync(tenantId, integrationId, userId) — marcar CANCELADA + log
  - CheckEstadoAsync(tenantId, slug) — bool rápido

- [ ] **INT-9**: Crear Endpoints `apps/api/src/HandySales.Api/Endpoints/IntegrationEndpoints.cs`
  ```
  MapGroup("/api/integrations").RequireAuthorization()
  GET  /api/integrations                    → Catálogo completo (con flag activada por tenant)
  GET  /api/integrations/{slug}             → Detalle de una integración
  GET  /api/integrations/mis-integraciones  → Activas del tenant actual
  POST /api/integrations/{slug}/activar     → Activar (Admin/SuperAdmin only)
  POST /api/integrations/{slug}/desactivar  → Desactivar (Admin/SuperAdmin only)
  GET  /api/integrations/{slug}/estado      → Check rápido si está activa
  ```

- [ ] **INT-10**: Registrar en DI + Program.cs
  - `ServiceRegistrationExtensions.cs`: registrar IIntegrationRepository, IntegrationService
  - `Program.cs`: agregar `app.MapIntegrationEndpoints();`

- [ ] **INT-11**: Rebuild y verificar
  - `docker-compose -f docker-compose.dev.yml up -d --build api_main`
  - Swagger: verificar 6 endpoints en `/api/integrations`
  - Verificar seed: `SELECT * FROM Integrations` (4 registros)

### INT Fase 2: Frontend — Marketplace Page

- [ ] **INT-12**: Crear types `apps/web/src/types/integrations.ts`
  ```typescript
  export interface IntegrationCatalog {
    id: number; slug: string; nombre: string; descripcion: string;
    descripcionCorta: string; icono: string; categoria: string;
    tipoPrecio: 'PERMANENTE' | 'MENSUAL' | 'GRATIS';
    precioMXN: number; precioSetupMXN: number;
    requiereConfiguracion: boolean;
    estado: 'DISPONIBLE' | 'PROXIMO' | 'DESCONTINUADO';
    activada: boolean; versionIntegracion: string;
  }
  export interface TenantIntegration {
    id: number; integrationSlug: string; integrationNombre: string;
    estado: 'ACTIVA' | 'SUSPENDIDA' | 'CANCELADA';
    fechaActivacion: string; configuracionJson?: string;
  }
  ```

- [ ] **INT-13**: Crear service `apps/web/src/services/api/integrations.ts`
  - Usa instancia `api` existente (Main API port 1050)
  - Métodos: getAll, getBySlug, getMisIntegraciones, activar, desactivar, checkEstado
  - Registrar en `services/api/index.ts`

- [ ] **INT-14**: Crear billing service `apps/web/src/services/api/billing.ts`
  - Instancia axios SEPARADA apuntando a Billing API
  - `const BILLING_API_URL = process.env.NEXT_PUBLIC_BILLING_API_URL || 'http://localhost:1051'`
  - Misma lógica de auth interceptor que `api.ts` (Bearer token de NextAuth session)
  - Métodos facturas: getFacturas, getFactura, createFactura, timbrarFactura, cancelarFactura, getPdf, getXml, enviarFactura
  - Métodos catálogos: getTiposComprobante, getMetodosPago, getFormasPago, getUsosCfdi
  - Métodos config: getConfigFiscal, createConfigFiscal, updateConfigFiscal, uploadCertificado, getNumeracion
  - Métodos reportes: getDashboard, getVentasPeriodo, getClientesFacturacion, getEstadosFactura
  - Registrar en `services/api/index.ts`

- [ ] **INT-15**: Agregar env var `NEXT_PUBLIC_BILLING_API_URL=http://localhost:1051` en `.env.local`

- [ ] **INT-16**: Crear `apps/web/src/contexts/IntegrationsContext.tsx`
  - Carga integraciones activas del tenant al iniciar sesión
  - Expone `hasIntegration(slug): boolean` y `activeIntegrations: TenantIntegration[]`
  - Se refresca automáticamente al activar/desactivar
  - Inicializar en `ClientProviders` junto a CompanyContext, ProfileContext

- [ ] **INT-17**: Modificar Sidebar `apps/web/src/components/layout/Sidebar.tsx`
  - Import: `Plugs` from `@phosphor-icons/react`
  - Agregar item en `sidebarItems` entre "Entregas" y "Administración":
    `{ id: 'integrations', label: 'Integraciones', icon: Plugs, href: '/integrations', permission: 'view_integrations' }`
  - Color: `integrations: { active: 'text-fuchsia-600', inactive: 'text-fuchsia-500 group-hover:text-fuchsia-600' }`
  - Agregar `'view_integrations'` a ROLE_PERMISSIONS de ADMIN y SUPER_ADMIN

- [ ] **INT-18**: Modificar middleware `apps/web/src/middleware.ts`
  - Agregar a ROLE_RESTRICTED_ROUTES: `'/integrations': [UserRole.ADMIN, UserRole.SUPER_ADMIN]`

- [ ] **INT-19**: Crear marketplace page `apps/web/src/app/(dashboard)/integrations/page.tsx`
  - Título: "Integraciones" con subtítulo descriptivo
  - Filtro por categoría: tabs (Todas, Facturación, Comunicación, Mapas, Pagos)
  - Grid responsivo (1 col mobile, 2 cols tablet, 3 cols desktop)
  - Cada card: icono Phosphor (color por categoría), nombre, descripción corta, badge categoría
  - Precio formateado ("$1,499 MXN / permanente" o "$299 MXN / mes")
  - Status badges: "Activa" (green), "Disponible" (blue), "Próximamente" (gray disabled)
  - Click "Activar" → Drawer lateral con detalles + precio + confirmar → POST activar → toast
  - Click "Configurar" → navegar a `/integrations/{slug}`

- [ ] **INT-20**: Actualizar BillingTab `apps/web/src/app/(dashboard)/settings/components/BillingTab.tsx`
  - Si `hasIntegration('facturacion-sat')`: "Facturación SAT activa ✓" + link a `/integrations/facturacion-sat`
  - Si no: "Activa la facturación desde el Marketplace" + link a `/integrations`

### INT Fase 3: Frontend — Portal de Facturación (sub-páginas)

- [ ] **INT-21**: Actualizar CORS en Billing API `apps/billing/HandySales.Billing.Api/Program.cs`
  - Agregar `http://localhost:1083` a CORS origins (y dominio Vercel para prod)

- [ ] **INT-22**: Crear dashboard `apps/web/src/app/(dashboard)/integrations/facturacion-sat/page.tsx`
  - 4 KPIs: Total facturas, Timbradas, Pendientes, Monto total mes
  - Acciones rápidas: "Nueva Factura", "Ver Facturas", "Configuración Fiscal"
  - Mini-tabla últimas 5 facturas — datos de `billingService.getDashboard()`

- [ ] **INT-23**: Crear lista facturas `apps/web/src/app/(dashboard)/integrations/facturacion-sat/facturas/page.tsx`
  - Patrón tabla estándar (como products/page.tsx)
  - Filtros: rango fechas, estado dropdown, RFC cliente
  - Columnas: Serie-Folio, Fecha, Cliente, RFC, Total, Estado, Acciones
  - Acciones: Ver detalle (drawer), Timbrar (si PENDIENTE), Cancelar (si TIMBRADA), PDF, XML
  - Mobile cards + paginación con X-Total-Count

- [ ] **INT-24**: Crear nueva factura `apps/web/src/app/(dashboard)/integrations/facturacion-sat/nueva-factura/page.tsx`
  - Form multi-sección con React Hook Form + Zod
  - Emisor auto-llenado desde config fiscal (solo lectura)
  - Receptor: buscar cliente existente o RFC manual
  - Detalle: tabla editable de líneas (producto, clave SAT, cantidad, precio, IVA)
  - Resumen: subtotal, descuento, IVA trasladado, retenciones, total
  - Selects SAT: Tipo Comprobante, Método Pago, Forma Pago, Uso CFDI

- [ ] **INT-25**: Crear config fiscal `apps/web/src/app/(dashboard)/integrations/facturacion-sat/configuracion-fiscal/page.tsx`
  - Form: RFC, Razón Social, Régimen Fiscal (select), Domicilio Fiscal (CP)
  - Upload CSD: .cer + .key + password → POST multipart
  - Config Serie/Folio: tabla series + crear nueva
  - Sección PAC: disabled con "Próximamente"

- [ ] **INT-26**: Crear reportes `apps/web/src/app/(dashboard)/integrations/facturacion-sat/reportes/page.tsx`
  - Ventas por periodo: date range + gráfica barras (recharts)
  - Top clientes facturación: tabla RFC, nombre, total, # facturas
  - Estados facturas: pie chart (Pendientes, Timbradas, Canceladas)

### INT Fase 4: PAC Real (DIFERIDO — NO implementar ahora)

- [ ] **INT-27**: Integrar PAC real (Finkok o SW) para timbrado
- [ ] **INT-28**: Generación PDF real con layout CFDI
- [ ] **INT-29**: XML real per esquema SAT CFDI 4.0
- [ ] **INT-30**: Validación certificados CSD contra SAT
- [ ] **INT-31**: Flujo cancelación real con acuse SAT

### Archivos nuevos vs modificados

**Nuevos backend (8):** Integration.cs, TenantIntegration.cs, IntegrationLog.cs, IntegrationDtos.cs, IIntegrationRepository.cs, IntegrationService.cs, IntegrationRepository.cs, IntegrationEndpoints.cs
**Nuevos frontend (10):** integrations.ts (types), integrations.ts (service), billing.ts, IntegrationsContext.tsx, integrations/page.tsx, facturacion-sat/page.tsx, facturas/page.tsx, nueva-factura/page.tsx, configuracion-fiscal/page.tsx, reportes/page.tsx
**Nuevo infra (1):** 07_integrations_seed.sql
**Modificados backend (3):** HandySalesDbContext.cs, Program.cs (main), Program.cs (billing CORS)
**Modificados frontend (4):** Sidebar.tsx, middleware.ts, services/api/index.ts, BillingTab.tsx
**EF Migration (auto):** AddIntegrationsMarketplace

### Verificación

1. Rebuild API → Swagger `/api/integrations` funciona (6 endpoints)
2. Seed: 4 integraciones en DB (1 DISPONIBLE + 3 PROXIMO)
3. Sidebar: "Integraciones" visible Admin/SuperAdmin, oculto Vendedor
4. Marketplace: `/integrations` muestra 4 cards correctamente
5. Activar Facturación SAT → card cambia a "Configurar"
6. Dashboard facturación: KPIs desde Billing API (port 1051)
7. CRUD facturas: lista, crear, timbrar (simulado), cancelar
8. Config fiscal: RFC + certificados se guardan
9. Reportes: gráficas renderizan con datos
10. Permisos: Vendedor bloqueado en `/integrations`
