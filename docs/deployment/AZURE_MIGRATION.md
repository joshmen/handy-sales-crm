# Azure Migration Guide — HandySales

## When to Migrate

Migrate from Railway to Azure when:
- 1,000+ active users in Mexico (latency matters)
- Need compliance with Mexican data residency
- Revenue justifies $150-220/month infrastructure cost
- Need auto-scaling for peak hours

## Target Architecture

```
                    Azure Mexico Central (Querétaro)
┌────────────────────────────────────────────────────────┐
│                                                        │
│  Container Apps Environment                            │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Main API │  │ Billing API  │  │ Mobile API   │    │
│  │ .NET 8   │  │ .NET 9       │  │ .NET 8       │    │
│  │ 0.25 vCPU│  │ 0.25 vCPU    │  │ 0.25 vCPU    │    │
│  │ 0.5Gi RAM│  │ 0.5Gi RAM    │  │ 0.5Gi RAM    │    │
│  └────┬─────┘  └──────┬───────┘  └──────┬───────┘    │
│       │                │                  │            │
│  ┌────┴────────────────┴──────────────────┴──────┐    │
│  │         MySQL Flexible Server (B1ms)          │    │
│  │         1 vCore, 2 GB RAM, 20 GB storage      │    │
│  │         ├── handy_erp                         │    │
│  │         └── handy_billing                     │    │
│  └───────────────────────────────────────────────┘    │
│                                                        │
└────────────────────────────────────────────────────────┘

Vercel CDN (stays) → app.handycrm.com
```

## Cost Estimate

| Service | SKU | Cost/month |
|---------|-----|------------|
| Container Apps (3 apps) | Consumption plan | $60-100 |
| MySQL Flexible Server | Burstable B1ms | $15-20 |
| Storage (logs, uploads) | Standard LRS | $1-2 |
| Bandwidth | 50 GB outbound | $4-5 |
| **Total** | | **$80-127** |

## Prerequisites

- Azure subscription
- Azure CLI installed: `az login`
- Domain DNS access

## Step 1: Deploy Infrastructure

```bash
# Create resource group
az group create --name handysales-rg --location mexicocentral

# Deploy MySQL + Container Apps
az deployment group create \
  --resource-group handysales-rg \
  --template-file infra/azure/container-apps.bicep \
  --parameters \
    mysqlAdminPassword='<strong-password>' \
    jwtSecretKey='<same-as-railway>' \
    containerRegistryName='handysalesacr'
```

## Step 2: Push Docker Images

```bash
# Create Azure Container Registry
az acr create --name handysalesacr --resource-group handysales-rg --sku Basic

# Login to ACR
az acr login --name handysalesacr

# Build and push images
docker build -f infra/docker/Dockerfile.Main.Prod -t handysalesacr.azurecr.io/api-main:latest .
docker push handysalesacr.azurecr.io/api-main:latest

docker build -f infra/docker/Dockerfile.Billing.Prod -t handysalesacr.azurecr.io/api-billing:latest .
docker push handysalesacr.azurecr.io/api-billing:latest

docker build -f infra/docker/Dockerfile.Mobile.Prod -t handysalesacr.azurecr.io/api-mobile:latest .
docker push handysalesacr.azurecr.io/api-mobile:latest
```

## Step 3: Import Database

```bash
# Get MySQL connection string from Azure
az mysql flexible-server show --resource-group handysales-rg --name handysales-mysql

# Import schema (from local or Railway backup)
mysql -h handysales-mysql.mysql.database.azure.com \
  -u adminuser -p \
  handy_erp < infra/database/schema/01_init_schema_multitenant.sql

# Import data (mysqldump from Railway)
railway run --service mysql -- mysqldump handy_erp > backup_erp.sql
mysql -h handysales-mysql.mysql.database.azure.com -u adminuser -p handy_erp < backup_erp.sql
```

## Step 4: Update DNS

| Domain | Old (Railway) | New (Azure) |
|--------|---------------|-------------|
| api.handycrm.com | Railway CNAME | Azure Container App FQDN |
| billing.handycrm.com | Railway CNAME | Azure Container App FQDN |
| mobile.handycrm.com | Railway CNAME | Azure Container App FQDN |
| app.handycrm.com | Vercel (no change) | Vercel (no change) |

## Step 5: Update Vercel Environment

Update `NEXT_PUBLIC_API_URL` and `API_URL` in Vercel to point to new Azure URLs if using different domains.

If custom domains stay the same, no Vercel changes needed.

## Step 6: Verify

```bash
curl https://api.handycrm.com/health
curl https://billing.handycrm.com/health
curl https://mobile.handycrm.com/health
```

## Step 7: Decommission Railway

After verifying Azure works:
1. Monitor for 48 hours
2. Remove Railway services
3. Cancel Railway subscription

## Rollback Plan

If Azure has issues:
1. Point DNS back to Railway
2. Railway services still running (don't delete until verified)
3. DNS propagation: ~5 minutes with low TTL

## Files

| File | Purpose |
|------|---------|
| `infra/azure/container-apps.bicep` | IaC for Container Apps + MySQL |
| `infra/azure/mysql-database.bicep` | Standalone MySQL (already exists) |
| `infra/nginx/nginx.prod.conf` | Reverse proxy (if using Azure Container Instances instead) |
| `infra/docker/Dockerfile.*.Prod` | Same Dockerfiles work for both Railway and Azure |
