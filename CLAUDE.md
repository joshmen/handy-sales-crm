# Handy Suites — Project Context

CRM/ERP system for Mexican SMEs with SAT billing compliance. Multi-tenant, microservices architecture.

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

## Architecture at a Glance

```
Frontend (apps/web/)         -> Next.js 15 + React 19 + TypeScript + Tailwind CSS 3.4
Main API (apps/api/)         -> .NET 8, Clean Architecture, EF Core, MySQL 8.0
Mobile API (apps/mobile/)    -> .NET 8, Minimal APIs for React Native app (SEPARATE)
Billing API (apps/billing/)  -> .NET 9, SAT CFDI compliance, separate MySQL schema
Mobile App (apps/mobile-app/) -> React Native (Expo), TypeScript, WatermelonDB, offline-first
AI Gateway (apps/ai/)         -> .NET 8, OpenAI/Azure OpenAI, pgvector, RAG per tenant
Shared Libraries (libs/)     -> Domain, Application, Infrastructure, Shared
Database (infra/database/)   -> MySQL 8.0 dual: handy_erp + handy_billing
Deployment                   -> Vercel (frontend) + Railway (APIs + MySQL) ~$25-40/month
```

> Full structure: `docs/architecture/PROJECT_STRUCTURE.md` | Entities & endpoints: `docs/architecture/OVERVIEW.md`

## Technology Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15.4.6, React 19.1.0, TypeScript 5, Tailwind 3.4, Zustand, Radix UI, NextAuth.js, React Hook Form + Zod |
| Backend | .NET 8/9, C# 12, EF Core, FluentValidation, AutoMapper, Serilog, JWT Bearer |
| Mobile | React Native 0.76+, Expo SDK 52, TypeScript 5, WatermelonDB, Zustand, TanStack Query |
| AI | .NET 8, OpenAI API (gpt-4o-mini default), pgvector, text-embedding-3-small |
| Database | MySQL 8.0 (Pomelo provider), multi-tenant with tenant_id |
| Infra | Docker, Vercel (frontend), Railway (APIs + MySQL) |

## Development Quick Start

```bash
# 1. Start backend services in Docker
docker-compose -f docker-compose.dev.yml up -d

# 2. Start frontend locally (separate terminal)
cd apps/web && npm run dev
```

**After backend code changes**: `docker-compose -f docker-compose.dev.yml up -d --build api_main`
**Frontend changes**: No restart needed — Next.js hot reload applies instantly.
**NEVER delete `apps/web/.next/`** while the dev server is running — corrupts the server.
**NEVER use `docker-compose down -v`** — deletes ALL database data.

### Testing Commands

```bash
# Backend tests (300+ xUnit tests)
dotnet test

# Frontend type check
cd apps/web && npm run type-check

# E2E tests (Playwright)
cd apps/web && npx playwright test              # Full suite
cd apps/web && npx playwright test auth.spec.ts  # Single file

# Find process on port (Windows — netstat often fails, use PowerShell)
powershell.exe -Command "Get-NetTCPConnection -LocalPort 1083 | Select-Object OwningProcess"
powershell.exe -Command "Stop-Process -Id <PID> -Force"
```

> Full setup guide: `docs/development/SETUP.md` | Data persistence: `docs/development/DATA_PERSISTENCE.md`

## Port Configuration

```
Frontend:    http://localhost:1083
Main API:    http://localhost:1050  (Swagger: /swagger)
Billing API: http://localhost:1051  (Swagger: /swagger)
Mobile API:  http://localhost:1052  (Swagger: /swagger)
AI Gateway:  http://localhost:1053  (Swagger: /swagger)
Seq Logs:    http://localhost:1082
MySQL:       localhost:3306
```

> Full port table & credentials: `docs/development/PORTS_AND_CREDENTIALS.md`

## Credentials (Quick Reference)

| What | User | Password |
|------|------|----------|
| MySQL | `handy_user` | `handy_pass` |
| MySQL root | `root` | `root123` |
| App (all users) | `admin@jeyma.com` | `test123` |

**Recommended for testing:** `admin@jeyma.com` / `test123` (tenant with most seed data)

Other users: `vendedor1@jeyma.com`, `admin@huichol.com`, `admin@centro.com`, `admin@rutasnorte.com` (all `test123`)

## Conventions

- Language: Spanish (es) for UI and business terms
- Backend naming: PascalCase (C#) | Frontend naming: camelCase (TypeScript)
- API style: RESTful with Minimal APIs
- Auth: JWT + NextAuth.js
- Multi-tenant: All tables have `tenant_id` column
- Billing separated by SAT compliance requirements

### MANDATORY — Entity Creation Rules

Every new domain entity MUST:
1. **Inherit `AuditableEntity`** (`libs/HandySales.Domain/Common/AuditableEntity.cs`) — provides `Activo`, `CreadoEn`, `ActualizadoEn`, `CreadoPor`, `ActualizadoPor`, `EliminadoEn`, `EliminadoPor`, `Version`
2. **Have a global query filter** in `HandySalesDbContext.OnModelCreating` that includes `e.EliminadoEn == null`. If the entity has `TenantId`, combine both: `e => (!ShouldApplyTenantFilter || e.TenantId == CurrentTenantId) && e.EliminadoEn == null`
3. **Use `.Remove()` for deletes** — `SaveChangesAsync` override auto-converts to soft delete (sets `EliminadoEn` + `EliminadoPor`)
4. **Never hard-delete** an `AuditableEntity` — if physical delete needed, entity should NOT inherit `AuditableEntity`

## Git Workflow Rules

- **NEVER push automatically.** Always test locally first. Only push when user explicitly requests it.
- Commits are fine without asking, but `git push` requires explicit user instruction.
- **Before ANY push**, present a **Pre-Push Deployment Checklist**:
  1. New env vars needed in Railway/Vercel/Azure
  2. DB migrations that will auto-apply in production
  3. CI/CD pipeline changes
  4. Azure Bicep/docs updates
  5. Schema base update needed?
  6. Breaking API contract changes
- **CRITICAL — Env vars notification**: After ANY commit that introduces new env var references, immediately tell the user which variables need to be added to which platform BEFORE they can push.

## EF Core Migrations — Quick Reference

**PATH fix required**: `.dotnet/tools` is NOT in bash PATH.

```bash
# Generate migration
export PATH="$PATH:/c/Users/AW AREA 51M R2/.dotnet/tools"
dotnet-ef migrations add DescripcionDelCambio \
  --project libs/HandySales.Infrastructure \
  --startup-project apps/api/src/HandySales.Api \
  --output-dir Migrations

# Verify: rebuild API container
docker-compose -f docker-compose.dev.yml up -d --build api_main
```

**Rules**: NEVER delete applied migrations. ALWAYS commit `Migrations/` folder. MANDATORY: generate migration before committing any entity/DbContext changes.

> Full migration guide: `docs/development/EF_MIGRATIONS.md`

## Agent Strategy

Use Haiku for exploration/moves/builds ($0.25/M), Sonnet for coding/refactoring/testing ($3/M), Opus for architecture/critical decisions ($15/M).

> Full agent table: `docs/architecture/AGENT_STRATEGY.md`

## Current Sprint & Pending Work

### 🟡 In Progress — Mobile App
- **MOB-6**: Polish — Crash reporting, error boundaries, Zod validation
- **MOB-7**: Store Release — EAS Submit, TestFlight, Play Store

### 🟢 Pending
- **BILL-1**: Conectar PAC real para timbrado CFDI
- **INT-***: Marketplace de Integraciones (spec in `docs/INTEGRATION_MARKETPLACE_SPEC.md`)
- **AI-***: AI Gateway microservice (spec in `docs/architecture/AI_STRATEGY.md`)
- **FUT-3**: Azure migration (when 1,000+ users)
- **FUT-4**: Custom domain
- **INFRA-5**: Message broker (Redis Streams) + Push Worker
- **RT-9**: SignalR real-time mobile sync → web backoffice
- **SEC-M1-M4**: Mobile security (SQLCipher, biometric, cert pinning, root detection)

> Full checklist history: `tasks/checklist-maestro-feb2026.md`
> Completed sprint: `tasks/sprint-feb24-completed.md`

## Deployment

**Current**: Vercel (frontend, $0) + Railway (3 APIs + MySQL, $25-40/month)
**Future**: Azure Mexico Central when 1,000+ users ($75-140/month)
**CI/CD**: `.github/workflows/deploy-apis.yml` — push to main → auto-deploy

> Full deployment guide: `docs/architecture/DEPLOYMENT.md`

## Detailed Documentation Index

### Architecture
- [`docs/architecture/OVERVIEW.md`](docs/architecture/OVERVIEW.md) — Architecture diagram, entities, endpoints, tech stack
- [`docs/architecture/PROJECT_STRUCTURE.md`](docs/architecture/PROJECT_STRUCTURE.md) — Full monorepo directory tree
- [`docs/architecture/DEPLOYMENT.md`](docs/architecture/DEPLOYMENT.md) — Deployment strategy, env vars, costs
- [`docs/architecture/MOBILE_APP.md`](docs/architecture/MOBILE_APP.md) — React Native app architecture, offline-first, roadmap
- [`docs/architecture/AI_STRATEGY.md`](docs/architecture/AI_STRATEGY.md) — AI add-on packs, credits, RAG, endpoints
- [`docs/architecture/AGENT_STRATEGY.md`](docs/architecture/AGENT_STRATEGY.md) — Model selection for AI coding agents

### Development
- [`docs/development/SETUP.md`](docs/development/SETUP.md) — Full development environment setup
- [`docs/development/PORTS_AND_CREDENTIALS.md`](docs/development/PORTS_AND_CREDENTIALS.md) — All ports and login credentials
- [`docs/development/DATA_PERSISTENCE.md`](docs/development/DATA_PERSISTENCE.md) — Docker seeds, data reset procedures
- [`docs/development/EF_MIGRATIONS.md`](docs/development/EF_MIGRATIONS.md) — EF Core migration workflow

### Planning & Tracking
- [`docs/SCREEN_STATUS.md`](docs/SCREEN_STATUS.md) — React vs Pencil screen reconciliation
- [`docs/INTEGRATION_MARKETPLACE_SPEC.md`](docs/INTEGRATION_MARKETPLACE_SPEC.md) — Full INT marketplace specification
- [`tasks/checklist-maestro-feb2026.md`](tasks/checklist-maestro-feb2026.md) — Master checklist with completion history
- [`tasks/sprint-feb24-completed.md`](tasks/sprint-feb24-completed.md) — Feb 24 sprint (completed)

### Existing Docs
- [`docs/deployment/`](docs/deployment/) — Railway, Vercel, Azure setup guides
- [`docs/PLAN_GENERAL_PENDIENTES.md`](docs/PLAN_GENERAL_PENDIENTES.md) — General pending plan
- [`docs/PLAN_MEJORAS_HANDYSALES.md`](docs/PLAN_MEJORAS_HANDYSALES.md) — Improvement plan
