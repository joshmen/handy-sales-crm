# HandySales — Deployment Guide

## Overview

| Component | Provider | Cost | URL |
|-----------|----------|------|-----|
| Frontend | Vercel (Free) | $0/month | app.handycrm.com |
| Main API | Railway | ~$10-15/month | api.handycrm.com |
| Billing API | Railway | ~$5-10/month | billing.handycrm.com |
| Mobile API | Railway | ~$5-10/month | mobile.handycrm.com |
| MySQL 8.0 | Railway | ~$10-15/month | (internal) |
| **Total** | | **~$25-40/month** | |

## Architecture

```
Users (Mexico)
     │
     ├──> Vercel CDN (Edge) ──> Next.js 15 Frontend
     │                              │
     │                              ├── NEXTAUTH_URL → app.handycrm.com
     │                              └── NEXT_PUBLIC_API_URL → api.handycrm.com
     │
     └──> Railway (US) ──> Main API (.NET 8) ──┐
              │                                 │
              ├──> Billing API (.NET 9) ────────┤──> MySQL 8.0
              │                                 │    ├── handy_erp
              └──> Mobile API (.NET 8) ─────────┘    └── handy_billing
```

## Quick Start

1. **Frontend**: See [VERCEL_SETUP.md](VERCEL_SETUP.md)
2. **Backend + DB**: See [RAILWAY_SETUP.md](RAILWAY_SETUP.md)
3. **Future Azure migration**: See [AZURE_MIGRATION.md](AZURE_MIGRATION.md)

## CI/CD

- **Frontend**: Automatic deploy on push to `main` via Vercel GitHub integration
- **Backend**: Automatic deploy on push to `main` via `.github/workflows/deploy-apis.yml`
  - Only deploys services whose files changed
  - Manual trigger available via GitHub Actions UI

## Environment Variables

See `.env.production.template` in project root for all required variables.

**Security reminders:**
- Never commit real secrets to git
- Use `openssl rand -base64 32` for NEXTAUTH_SECRET
- Use `openssl rand -base64 64` for JWT__SecretKey
- NEXTAUTH_SECRET and JWT__SecretKey must be different values
- Railway auto-generates MySQL credentials

## Custom Domains

| Domain | Points to | Provider |
|--------|-----------|----------|
| app.handycrm.com | Vercel | CNAME to cname.vercel-dns.com |
| api.handycrm.com | Railway (main) | CNAME from Railway dashboard |
| billing.handycrm.com | Railway (billing) | CNAME from Railway dashboard |
| mobile.handycrm.com | Railway (mobile) | CNAME from Railway dashboard |

## Production Dockerfiles

| File | Service | .NET Version |
|------|---------|-------------|
| `infra/docker/Dockerfile.Main.Prod` | Main API | .NET 8 |
| `infra/docker/Dockerfile.Billing.Prod` | Billing API | .NET 9 |
| `infra/docker/Dockerfile.Mobile.Prod` | Mobile API | .NET 8 |

All use:
- Alpine base images (smaller)
- Multi-stage builds (build in SDK, run in ASP.NET)
- Non-root user (`appuser`)
- Release configuration
- Dynamic port via `$PORT` environment variable
- Health checks on `/health`

## Database

Two schemas in one MySQL 8.0 instance:
- `handy_erp` — Main application data (multi-tenant)
- `handy_billing` — SAT CFDI billing data

Init scripts: `infra/database/schema/` (01-06 in order)

## Monitoring

- **Vercel**: Built-in analytics + Web Vitals
- **Railway**: Built-in metrics + logs
- **Optional**: Seq for centralized .NET logging (set `Seq__ServerUrl`)
