# Deployment Strategy

> Extracted from CLAUDE.md — full deployment configuration, env vars, and cost analysis.

## Current: Vercel (Frontend) + Railway (Backend + DB) — ~$25-35/month
## Future: Azure Mexico Central (Queretaro) — when 1,000+ users

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
│                 │     │  │Mobile   │   │ PostgreSQL 16│  │
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
ConnectionStrings__DefaultConnection=Host=<railway-pg-host>;Port=5432;Database=handy_erp;Username=postgres;Password=<auto>;Pooling=true;SSL Mode=Require;Trust Server Certificate=true;
JWT__SecretKey=<openssl rand -base64 64>
JWT__Issuer=HandySuites
JWT__Audience=HandySuitesUsers
JWT__ExpirationHours=24
SENDGRID_API_KEY=<from SendGrid dashboard>
SENDGRID_FROM_EMAIL=<verified sender, e.g. noreply@handysuites.com>
SENDGRID_FROM_NAME=Handy Suites
```

**Billing API (Railway Dashboard):**
```
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:${PORT}
ConnectionStrings__BillingConnection=Host=<railway-pg-host>;Port=5432;Database=handy_billing;Username=postgres;Password=<auto>;Pooling=true;SSL Mode=Require;Trust Server Certificate=true;
ConnectionStrings__MainConnection=Host=<railway-pg-host>;Port=5432;Database=handy_erp;Username=postgres;Password=<auto>;Pooling=true;SSL Mode=Require;Trust Server Certificate=true;
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
docker build -f infra/docker/Dockerfile.Main.Prod -t handysuites-api .
docker build -f infra/docker/Dockerfile.Billing.Prod -t handysuites-billing .
docker build -f infra/docker/Dockerfile.Mobile.Prod -t handysuites-mobile .
```

### Cost Breakdown

| Service | Provider | Cost/month |
|---------|----------|------------|
| Frontend | Vercel Free | $0 |
| 3 APIs (.NET) | Railway Pro | $15-25 |
| PostgreSQL 16 | Railway | $10-15 |
| **Total** | | **$25-40** |

### Future Migration to Azure

When reaching 1,000+ active users, migrate for lower latency in Mexico:

| Service | Provider | Cost/month |
|---------|----------|------------|
| Frontend | Vercel (stays) | $0-20 |
| 3 APIs | Azure Container Apps (Queretaro) | $60-100 |
| PostgreSQL | Azure Flexible Server (Queretaro) | $15-20 |
| **Total** | | **$75-140** |

Files ready for Azure:
- `infra/azure/container-apps.bicep` — IaC for Container Apps
- `infra/azure/postgres-database.bicep` — PostgreSQL Flexible Server (formerly mysql-database.bicep, pre-migration)
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
