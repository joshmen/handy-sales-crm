# Data Persistence

> Extracted from CLAUDE.md — Docker seed files and database persistence.

## How Docker Seeds Work

1. **First time** you run `docker-compose up`:
   - PostgreSQL volume is empty
   - Init scripts in `/docker-entrypoint-initdb.d/` run automatically
   - All seed data (tenants, users, products, clients) is created

2. **Subsequent runs**:
   - PostgreSQL volume has data
   - Init scripts are SKIPPED
   - Your data persists between restarts

## Seed Files (in order of execution)

| File | Purpose |
|------|---------|
| `01_init_schema_multitenant.sql` | Creates tables and schema |
| `02_seed_data.sql` | Tenants, zones, categories, clients, products (idempotent) |
| `03_create_user.sql` | Creates PostgreSQL user `handy_user` |
| `04-billing-schema.sql` | Billing database schema |
| `05-admin.sql` | Azure/admin config |
| `06-usuarios.sql` | Application users with BCrypt passwords (idempotent) |

## IMPORTANT: Never use `-v` flag unless you want to RESET everything

```bash
# SAFE - Preserves all your data
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d

# DANGEROUS - Deletes ALL data (users, products, clients, etc.)
docker-compose -f docker-compose.dev.yml down -v   # <- NEVER use unless intentional
```

## To Reset Database (if needed)

```bash
# Stop containers
docker-compose -f docker-compose.dev.yml down

# Delete PostgreSQL volume
docker volume rm handysales_postgres_dev_data

# Start fresh (seeds will run again)
docker-compose -f docker-compose.dev.yml up -d
```
