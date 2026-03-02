# EF Core Migrations

> Extracted from CLAUDE.md — full EF Core migration workflow and reference.

Schema changes are managed via EF Core Migrations. The baseline migration (`20260220015145_InitialBaseline`) captures the full schema. All future changes go through `dotnet ef migrations add`.

## Developer Workflow

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

## How It Works

| Environment | Strategy | Details |
|-------------|----------|---------|
| **Dev (Docker)** | Auto-apply on startup | `DatabaseMigrator.MigrateAsync()` in `Program.cs`, MySQL advisory lock prevents concurrent runs |
| **Production (CI/CD)** | `efbundle` before deploy | GitHub Actions builds bundle, applies to Railway/Azure MySQL, then deploys APIs |
| **Mobile API** | Skips migrations | `RUN_MIGRATIONS=false` — shares same DB as Main API |

## Key Files

- Migrations: `libs/HandySales.Infrastructure/Migrations/`
- Migrator: `libs/HandySales.Infrastructure/Persistence/DatabaseMigrator.cs`
- Factory: `libs/HandySales.Infrastructure/Persistence/DesignTimeDbContextFactory.cs`
- CI/CD: `.github/workflows/deploy-apis.yml` (`migrate-database` job)
- Docker baseline: `infra/database/schema/05_ef_migrations_baseline.sql`

## Important Rules

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
