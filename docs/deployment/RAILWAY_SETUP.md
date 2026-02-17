# Railway Setup — HandySales Backend

Guía paso a paso para desplegar las APIs de HandySales en Railway.

## Arquitectura en Railway

```
┌─────────────────────────────────────────────┐
│              Railway Project                 │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ main-api │  │mobile-api│  │billing-api│  │
│  │ .NET 8   │  │ .NET 8   │  │ .NET 9   │  │
│  │ Port auto│  │ Port auto│  │ Port auto│  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │              │              │        │
│       └──────┬───────┘              │        │
│              ▼                      ▼        │
│  ┌─────────────────┐  ┌─────────────────┐   │
│  │    MySQL 8.0    │  │    MySQL 8.0    │   │
│  │   handy_erp     │  │  handy_billing  │   │
│  │ (internal:3306) │  │ (same instance) │   │
│  └─────────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## Paso 1: Crear Proyecto en Railway

1. Ir a https://railway.app/new
2. Crear proyecto nuevo
3. Nombre sugerido: `handysales-prod`

---

## Paso 2: Agregar MySQL

1. Click **"+ New"** → **"Database"** → **"MySQL"**
2. Railway crea la instancia con credenciales automáticas
3. Ir a tab **Variables** y anotar:

| Variable | Descripción |
|----------|-------------|
| `MYSQL_PUBLIC_URL` | URL pública (para conectar desde fuera de Railway) |
| `MYSQLHOST` | Host interno: `mysql.railway.internal` |
| `MYSQLPORT` | Puerto interno: `3306` |
| `MYSQLUSER` | Usuario: `root` |
| `MYSQLPASSWORD` | Password auto-generado |

### Crear bases de datos e importar schema

Conectar desde Docker local (o cualquier MySQL client) usando la URL pública:

```bash
# Extraer host y puerto de MYSQL_PUBLIC_URL
# Formato: mysql://root:PASSWORD@HOST:PORT/railway

# Crear bases de datos
mysql -h <HOST> -P <PORT> -u root -p<PASSWORD> -e "
  CREATE DATABASE IF NOT EXISTS handy_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE DATABASE IF NOT EXISTS handy_billing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
"

# Crear usuario de aplicación
mysql -h <HOST> -P <PORT> -u root -p<PASSWORD> -e "
  CREATE USER IF NOT EXISTS 'handy_user'@'%' IDENTIFIED BY 'handy_pass_prod_2026';
  GRANT ALL PRIVILEGES ON handy_erp.* TO 'handy_user'@'%';
  GRANT ALL PRIVILEGES ON handy_billing.* TO 'handy_user'@'%';
  FLUSH PRIVILEGES;
"

# Importar schema completo desde DB local (mejor método)
# Opción A: Dump desde Docker local
docker exec handysales_mysql_dev bash -c "mysqldump -u root -proot123 --routines --triggers --single-transaction handy_erp 2>/dev/null > /tmp/erp_full.sql"
docker exec handysales_mysql_dev bash -c "mysql -h <HOST> -P <PORT> -u root -p<PASSWORD> handy_erp < /tmp/erp_full.sql"

# Importar billing schema
docker cp infra/database/schema/BillingSchema.sql handysales_mysql_dev:/tmp/billing.sql
docker exec handysales_mysql_dev bash -c "mysql -h <HOST> -P <PORT> -u root -p<PASSWORD> handy_billing < /tmp/billing.sql"
```

### Verificar importación

```bash
mysql -h <HOST> -P <PORT> -u root -p<PASSWORD> -e "
  SELECT 'handy_erp' as db, COUNT(*) as tables FROM information_schema.tables WHERE table_schema='handy_erp'
  UNION ALL
  SELECT 'handy_billing', COUNT(*) FROM information_schema.tables WHERE table_schema='handy_billing';
"
# Esperado: handy_erp = 28 tablas, handy_billing = 14 tablas
```

---

## Paso 3: Agregar Servicios API

Para cada servicio: **"+ New"** → **"GitHub Repo"** → seleccionar `joshmen/handy-sales-crm`

### 3.1 Main API

**Settings:**

| Setting | Valor |
|---------|-------|
| Service Name | `main-api` |
| Branch | `main` |
| Root Directory | _(vacío/default)_ |
| Builder | **Dockerfile** |
| Dockerfile Path | `infra/docker/Dockerfile.Main.Prod` |
| Watch Paths | `apps/api/**` y `libs/**` |
| Healthcheck Path | `/health` |
| Networking | Click **"Generate Domain"** |

**Variables (tab Variables → Raw Editor):**

```
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection=Server=mysql.railway.internal;Port=3306;Database=handy_erp;User=handy_user;Password=handy_pass_prod_2026;AllowUserVariables=true;AllowPublicKeyRetrieval=true;ConnectionTimeout=60;DefaultCommandTimeout=60;CharSet=utf8mb4;Pooling=true;MinimumPoolSize=5;MaximumPoolSize=50;ConnectionLifeTime=300;SslMode=None;
JWT__SecretKey=HandySalesProd2026SecretKeyMinimo256BitsSeguro_9a8b7c6d5e4f3g2h1i0j
JWT__Issuer=HandySales
JWT__Audience=HandySalesUsers
JWT__ExpirationHours=24
Multitenancy__DefaultTenantId=00000000-0000-0000-0000-000000000001
Multitenancy__DefaultTenantName=Default
Cloudinary__CloudName=demo_cloud
Cloudinary__ApiKey=demo_key
Cloudinary__ApiSecret=demo_secret
```

> **Nota:** `AllowPublicKeyRetrieval=true` es necesario para MySQL 8.0 con `caching_sha2_password`.
> Reemplazar `Cloudinary__*` con credenciales reales cuando se tenga cuenta de Cloudinary.

### 3.2 Mobile API

**Settings:**

| Setting | Valor |
|---------|-------|
| Service Name | `mobile-api` |
| Builder | **Dockerfile** |
| Dockerfile Path | `infra/docker/Dockerfile.Mobile.Prod` |
| Watch Paths | `apps/mobile/**` y `libs/**` |
| Healthcheck Path | `/health` |
| Networking | Click **"Generate Domain"** |

**Variables (tab Variables → Raw Editor):**

```
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection=Server=mysql.railway.internal;Port=3306;Database=handy_erp;User=handy_user;Password=handy_pass_prod_2026;AllowUserVariables=true;AllowPublicKeyRetrieval=true;ConnectionTimeout=60;DefaultCommandTimeout=60;CharSet=utf8mb4;Pooling=true;MinimumPoolSize=5;MaximumPoolSize=50;ConnectionLifeTime=300;SslMode=None;
JWT__SecretKey=HandySalesProd2026SecretKeyMinimo256BitsSeguro_9a8b7c6d5e4f3g2h1i0j
JWT__Issuer=HandySales
JWT__Audience=HandySalesUsers
JWT__ExpirationHours=24
Multitenancy__DefaultTenantId=00000000-0000-0000-0000-000000000001
Multitenancy__DefaultTenantName=Default
```

### 3.3 Billing API (futuro)

**Settings:**

| Setting | Valor |
|---------|-------|
| Service Name | `billing-api` |
| Builder | **Dockerfile** |
| Dockerfile Path | `infra/docker/Dockerfile.Billing.Prod` |
| Watch Paths | `apps/billing/**` |
| Healthcheck Path | `/health` |
| Networking | Click **"Generate Domain"** |

**Variables (tab Variables → Raw Editor):**

```
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__BillingConnection=Server=mysql.railway.internal;Port=3306;Database=handy_billing;User=handy_user;Password=handy_pass_prod_2026;AllowUserVariables=true;ConnectionTimeout=60;DefaultCommandTimeout=60;CharSet=utf8mb4;SslMode=None;
ConnectionStrings__MainConnection=Server=mysql.railway.internal;Port=3306;Database=handy_erp;User=handy_user;Password=handy_pass_prod_2026;AllowUserVariables=true;ConnectionTimeout=60;DefaultCommandTimeout=60;CharSet=utf8mb4;SslMode=None;
JWT__SecretKey=HandySalesProd2026SecretKeyMinimo256BitsSeguro_9a8b7c6d5e4f3g2h1i0j
JWT__Issuer=HandySales
JWT__Audience=HandySalesUsers
JWT__ExpirationHours=24
SAT__CertificadoPath=/app/certificates
SAT__WebServiceUrl=https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc
```

---

## Paso 4: Configurar Vercel (Frontend)

En Vercel → Settings → Environment Variables, agregar:

```
NEXTAUTH_SECRET=handysales-prod-secret-key-2026-cambiar-en-produccion
NEXTAUTH_URL=https://<tu-dominio-vercel>.vercel.app
API_URL=https://<main-api-domain>.up.railway.app
NEXT_PUBLIC_API_URL=https://<main-api-domain>.up.railway.app
```

> Reemplazar `<main-api-domain>` con el dominio generado por Railway para main-api.
> Reemplazar `<tu-dominio-vercel>` con tu URL de Vercel.

---

## Paso 5: Verificar Deployment

```bash
# Health checks
curl https://<main-api-domain>.up.railway.app/health
curl https://<mobile-api-domain>.up.railway.app/health

# Test login
curl -X POST https://<main-api-domain>.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@jeyma.com","password":"test123"}'
```

---

## Notas Importantes

### JWT Secret Key
- **DEBE ser igual en TODAS las APIs** (Main, Mobile, Billing)
- Los tokens generados por una API deben ser válidos en las otras
- Mínimo 256 bits (32 caracteres)

### Connection String
- Usar `mysql.railway.internal` (red interna, más rápido y gratis)
- NO usar la URL pública (más lento, cobra por tráfico)
- `SslMode=None` para conexiones internas de Railway

### Railway PORT
- Railway inyecta la variable `PORT` automáticamente
- Los Dockerfiles usan `CMD` con shell form para evaluarla en runtime
- NO es necesario agregar `PORT` o `ASPNETCORE_URLS` en las variables

### Auto-Deploy
- Railway detecta cambios en GitHub automáticamente
- Los Watch Paths limitan qué cambios triggerean un deploy
- Cambios en `libs/**` triggerean deploy de Main API y Mobile API (comparten código)

---

## Credenciales de Producción

### MySQL Railway
- **Host interno**: `mysql.railway.internal`
- **Puerto**: `3306`
- **Usuario app**: `handy_user`
- **Password app**: `handy_pass_prod_2026`
- **Bases de datos**: `handy_erp`, `handy_billing`

### Usuarios de Prueba
Password: `test123` para todos

| Email | Tenant | Rol |
|-------|--------|-----|
| admin@jeyma.com | Jeyma (id=3) | Admin |
| vendedor1@jeyma.com | Jeyma (id=3) | Vendedor |
| vendedor2@jeyma.com | Jeyma (id=3) | Vendedor |
| admin@huichol.com | Huichol (id=4) | Admin |
| admin@centro.com | Centro (id=1) | Admin |
| admin@rutasnorte.com | Rutas Norte (id=2) | Admin |

---

## Costos Estimados (Railway Trial/Pro)

| Servicio | Costo Estimado |
|----------|---------------|
| MySQL | $10-15/mes |
| Main API | $5-8/mes |
| Mobile API | $3-5/mes |
| Billing API | $3-5/mes |
| **Total** | **$21-33/mes** |

Railway Trial: 30 días o $5 USD de crédito.
Railway Pro: $20/mes incluye $20 de crédito.

---

## Troubleshooting

### Build falla con "dotnet restore failed"
- Verificar que el Dockerfile path sea correcto
- Verificar que `.dockerignore` no excluya archivos necesarios
- Root Directory debe estar vacío (build desde raíz del repo)

### Container crashea al iniciar
- Revisar logs en Railway → Deployments → click en el deployment → View Logs
- Verificar que las variables de entorno estén correctas
- Verificar que MySQL esté accessible (health check del servicio MySQL)

### MySQL connection refused
- Usar `mysql.railway.internal` (NO la URL pública)
- Verificar que el usuario `handy_user` exista y tenga permisos
- Verificar que las bases de datos `handy_erp` y `handy_billing` existan

### CORS errors en frontend
- Verificar que `NEXT_PUBLIC_API_URL` en Vercel apunte al dominio correcto de Railway
- La API en producción permite: `*.vercel.app`, `handysales.com`
