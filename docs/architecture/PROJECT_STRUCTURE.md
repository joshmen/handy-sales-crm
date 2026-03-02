# Project Structure (Monorepo)

> Extracted from CLAUDE.md — full directory tree reference.

```
HandySales/                          # Root
├── apps/                            # All microservices
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
├── libs/                            # Shared Libraries (NuGet packages)
│   ├── HandySales.Domain/           # 14 entities, business rules, aggregates
│   ├── HandySales.Application/      # DTOs, validators, services, use cases
│   ├── HandySales.Infrastructure/   # EF Core, MySQL, repositories, UoW
│   └── HandySales.Shared/           # Utilities, constants, extensions, exceptions
│
├── infra/                           # Infrastructure
│   ├── docker/                      # Dockerfiles (api, mobile, billing, web)
│   ├── azure/                       # Azure Bicep, deployment scripts
│   ├── nginx/                       # Nginx reverse proxy configs
│   └── database/                    # SQL & Data
│       ├── schema/                  # Init scripts (handy_erp, handy_billing)
│       ├── migrations/              # EF Core migrations
│       └── diagrams/                # ERD diagrams
│
├── docs/                            # Documentation
│   ├── architecture/                # Architecture & design patterns
│   ├── deployment/                  # Deployment guides
│   └── design/                      # Design assets
│       ├── pencil/                  # Pencil (.pen) designs
│       └── mockups/                 # UI screenshots
│
├── scripts/                         # Dev scripts
│   ├── dev-start.bat
│   └── dev-stop.bat
│
├── docker-compose.dev.yml           # Docker orchestration (all services)
└── CLAUDE.md                        # Project context for AI assistants
```
