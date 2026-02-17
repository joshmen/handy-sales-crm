# Railway Setup — HandySales Backend

## Prerequisites

- [Railway account](https://railway.app) (Pro plan: $20/month with $20 credit)
- [Railway CLI](https://docs.railway.app/develop/cli) installed
- GitHub repository connected to Railway

## Step 1: Create Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init
```

Or create via Railway Dashboard: https://railway.app/new

## Step 2: Add MySQL Service

1. In Railway Dashboard, click **"+ New"** → **"Database"** → **"MySQL"**
2. Railway auto-creates the database with credentials
3. Note the connection variables (available as `MYSQL_URL`, `MYSQL_HOST`, etc.)

### Create Second Database (handy_billing)

Connect to Railway MySQL and create the billing database:

```sql
CREATE DATABASE IF NOT EXISTS handy_billing
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

### Import Schema

Use the init scripts from `infra/database/schema/` in order:
1. `01_init_schema_multitenant.sql`
2. `02_seed_data.sql`
3. `03_create_user.sql`
4. `04-billing-schema.sql` (BillingSchema.sql)
5. `05-admin.sql`
6. `06-usuarios.sql` (04_seed_usuarios.sql)

```bash
# Connect to Railway MySQL
railway connect mysql

# Or use mysql client with Railway-provided credentials
mysql -h <MYSQL_HOST> -P <MYSQL_PORT> -u root -p<MYSQL_PASSWORD> handy_erp < infra/database/schema/01_init_schema_multitenant.sql
```

## Step 3: Add API Services

### Main API

1. Click **"+ New"** → **"GitHub Repo"** → Select your repo
2. Configure:
   - **Root Directory**: `/` (build from root)
   - **Builder**: Dockerfile
   - **Dockerfile Path**: `infra/docker/Dockerfile.Main.Prod`
   - **Watch Paths**: `apps/api/**`, `libs/**`

3. Set environment variables:

```
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:${PORT}
ConnectionStrings__DefaultConnection=Server=${MYSQL_HOST};Port=${MYSQL_PORT};Database=handy_erp;User=root;Password=${MYSQL_PASSWORD};AllowUserVariables=true;ConnectionTimeout=60;DefaultCommandTimeout=60;CharSet=utf8mb4;Pooling=true;MinimumPoolSize=5;MaximumPoolSize=50;ConnectionLifeTime=300;SslMode=Required;
JWT__SecretKey=<generate with: openssl rand -base64 64>
JWT__Issuer=HandySales
JWT__Audience=HandySalesUsers
JWT__ExpirationHours=24
Multitenancy__DefaultTenantId=00000000-0000-0000-0000-000000000001
Multitenancy__DefaultTenantName=Default
```

4. Add custom domain: `api.handycrm.com`

### Billing API

1. Click **"+ New"** → **"GitHub Repo"** → Same repo
2. Configure:
   - **Dockerfile Path**: `infra/docker/Dockerfile.Billing.Prod`
   - **Watch Paths**: `apps/billing/**`

3. Set environment variables:

```
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:${PORT}
ConnectionStrings__BillingConnection=Server=${MYSQL_HOST};Port=${MYSQL_PORT};Database=handy_billing;User=root;Password=${MYSQL_PASSWORD};AllowUserVariables=true;ConnectionTimeout=60;DefaultCommandTimeout=60;SslMode=Required;
ConnectionStrings__MainConnection=Server=${MYSQL_HOST};Port=${MYSQL_PORT};Database=handy_erp;User=root;Password=${MYSQL_PASSWORD};AllowUserVariables=true;ConnectionTimeout=60;DefaultCommandTimeout=60;SslMode=Required;
JWT__SecretKey=<same as Main API>
JWT__Issuer=HandySales
JWT__Audience=HandySalesUsers
JWT__ExpirationHours=24
SAT__CertificadoPath=/app/certificates
SAT__WebServiceUrl=https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc
```

4. Add custom domain: `billing.handycrm.com`

### Mobile API

1. Click **"+ New"** → **"GitHub Repo"** → Same repo
2. Configure:
   - **Dockerfile Path**: `infra/docker/Dockerfile.Mobile.Prod`
   - **Watch Paths**: `apps/mobile/**`, `libs/**`

3. Set environment variables: Same as Main API

4. Add custom domain: `mobile.handycrm.com`

## Step 4: Verify Deployment

```bash
# Health checks
curl https://api.handycrm.com/health
curl https://billing.handycrm.com/health
curl https://mobile.handycrm.com/health

# Test login
curl -X POST https://api.handycrm.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@jeyma.com","password":"test123"}'
```

## Step 5: CI/CD (Automatic)

Railway auto-deploys when you push to `main`. Additionally, the GitHub Actions workflow (`.github/workflows/deploy-apis.yml`) provides:
- Change detection (only deploys affected services)
- Manual deploy trigger
- Build status checks

## Railway CLI Commands

```bash
# View logs
railway logs --service api_main

# Open dashboard
railway open

# Check status
railway status

# Run one-off command
railway run --service api_main -- dotnet HandySales.Api.dll --urls "http://+:8080"
```

## Cost Estimation

| Service | Estimated Cost |
|---------|---------------|
| MySQL | $10-15/month |
| Main API | $5-8/month |
| Billing API | $3-5/month |
| Mobile API | $3-5/month |
| **Total** | **$21-33/month** |

Railway Pro plan includes $20 credit, so effective cost is even lower.

## Troubleshooting

### Build fails with "dotnet restore failed"
- Check that Dockerfile paths match monorepo structure
- Ensure `.dockerignore` doesn't exclude needed files

### Container crashes on startup
- Check `ASPNETCORE_URLS` uses `${PORT}` (Railway assigns dynamically)
- Verify MySQL connection string uses Railway variables

### MySQL connection refused
- Ensure `SslMode=Required` in connection string
- Use Railway's internal variables (`${MYSQL_HOST}`, `${MYSQL_PORT}`)
- Check that both databases exist (handy_erp, handy_billing)
