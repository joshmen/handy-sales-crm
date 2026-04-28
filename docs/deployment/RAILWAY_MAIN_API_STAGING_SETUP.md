# Crear servicio `main-api-staging` en Railway

> **Por qué**: hoy el ambiente staging solo tiene `mobile-api-staging`. Eso causa
> que cualquier cambio en `apps/api/` (web/admin) tenga que ir directo a producción
> sin staging previo. El bug `SinRutaActiva` + push notification de pedidos
> (commit `5483951`, abril 2026) no se pudo validar en staging — sólo en local
> Docker y producción. Crear este servicio cierra ese gap permanentemente.

## Pre-requisitos

- Acceso al proyecto Railway que ya hospeda staging (donde vive `mobile-api-staging`).
- La DB staging ya provisionada — connection pública: `postgresql://postgres:LgybemzVkdrhfbpCOMOILNiVYjzqscNc@nozomi.proxy.rlwy.net:59086/railway`.
- El user runtime non-superuser `handy_app` ya existe en esa DB (RLS deployment apr19).

## Pasos en Railway dashboard

### 1. Nuevo service desde el repo
- En el environment **staging**, click `+ New` → `GitHub Repo` → seleccionar `joshmen/handy-sales-crm`.
- **Branch**: `staging`.
- **Root Directory**: dejar `/` (raíz del monorepo).

### 2. Build settings
- **Builder**: Dockerfile.
- **Dockerfile Path**: `infra/docker/Dockerfile.api_main.Prod`.
- Confirmar que detecta el contexto del monorepo (debe leer `apps/api/src/HandySuites.Api/HandySuites.Api.csproj` + `libs/`).

### 3. Service settings
- **Service Name**: `main-api-staging`.
- **Watch Paths**: dejar vacío para que se gatille con cualquier cambio del branch (alternativa: `apps/api/**;libs/**;infra/docker/Dockerfile.api_main.Prod`).
- **Wait for CI**: habilitar — esto hace que Railway espere a que `.github/workflows/deploy-apis.yml` complete migrations antes de deployar.

### 4. Variables de entorno (copy-paste en bulk)

```
ASPNETCORE_ENVIRONMENT=Staging
ASPNETCORE_URLS=http://+:1050
ConnectionStrings__DefaultConnection=Host=postgres.railway.internal;Port=5432;Database=railway;Username=handy_app;Password=<ASK_USER>;Pooling=true;Minimum Pool Size=5;Maximum Pool Size=50;Connection Lifetime=300;
RUN_MIGRATIONS=false
Jwt__Secret=<ASK_USER — mismo secret que main-api-production para que JWT del web staging valide en mobile-api-staging>
Jwt__Issuer=HandySuites
Jwt__Audience=HandySuitesUsers
Jwt__ExpirationMinutes=60
SocialLogin__SharedSecret=<ASK_USER — mismo que main-api-production>
Multitenancy__DefaultTenantId=00000000-0000-0000-0000-000000000001
Multitenancy__DefaultTenantName=Default
Cloudinary__Url=<ASK_USER>
SENDGRID_API_KEY=<ASK_USER>
SENDGRID_FROM_EMAIL=noreply@handysuites.com
SENDGRID_FROM_NAME=HandySuites Staging
STRIPE_SECRET_KEY=<ASK_USER — pk_test_... (clave Stripe de test)>
STRIPE_WEBHOOK_SECRET=<ASK_USER>
OPENAI_API_KEY=<ASK_USER — opcional si no usas AI Gateway en staging>
AWS_ACCESS_KEY_ID=<ASK_USER — para CloudWatch logs / S3>
AWS_SECRET_ACCESS_KEY=<ASK_USER>
InternalApiKey=<ASK_USER — generar nuevo con openssl rand -hex 32; debe coincidir con el InternalApiKey de mobile-api-staging>
MobileApiUrl=https://mobile-api-staging.up.railway.app
App__FrontendUrl=https://staging.handysuites.com
BILLING_API_URL=<URL del billing staging si existe; si no, URL de billing-production>
BILLING_INTERNAL_API_KEY=<ASK_USER>
```

> **Crítico**: el `InternalApiKey` debe ser **el mismo** que mobile-api-staging — si difieren, los HTTP calls main→mobile fallan con 401 (es el header `X-Internal-Api-Key`).

### 5. Public networking
- En el tab **Settings** del nuevo servicio: **Generate Domain**.
- Esto genera algo como `main-api-staging.up.railway.app` (Railway elige el subdominio).
- **Anota la URL final** — habrá que actualizar la frontend de staging para que apunte ahí (`NEXT_PUBLIC_API_URL` en Vercel preview).

### 6. Actualizar `mobile-api-staging` para apuntar al nuevo main
En las env vars de `mobile-api-staging`:
- `MainApiUrl=https://main-api-staging.up.railway.app` (reemplazar el actual que apunta a production).

### 7. Aplicar migrations en staging DB
Antes del primer deploy del nuevo servicio, asegurarse que la DB staging está al día con migrations:

```bash
docker exec -i handysuites_postgres_dev psql "postgresql://postgres:LgybemzVkdrhfbpCOMOILNiVYjzqscNc@nozomi.proxy.rlwy.net:59086/railway" -c "SELECT \"MigrationId\" FROM \"__EFMigrationsHistory\" ORDER BY \"MigrationId\" DESC LIMIT 5;"
```

Debe retornar al menos `20260426190502_DropEsAdminEsSuperAdminFromUsuarios`. Si no, correr el workflow `.github/workflows/deploy-apis.yml` con `workflow_dispatch` apuntando a staging.

### 8. Verificación post-deploy
```bash
curl -sS https://main-api-staging.up.railway.app/health
# Esperado: {"status":"healthy","service":"HandySuites API Principal", ...}

curl -sS -X POST https://main-api-staging.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@jeyma.com","password":"test123"}'
# Esperado: 200 con JWT (o 409 ACTIVE_SESSION_EXISTS si ya hay sesión, ambos OK)
```

### 9. Update frontend staging (Vercel preview environment)
- Vercel project → Settings → Environment Variables → **Preview** scope:
  - `NEXT_PUBLIC_API_URL = https://main-api-staging.up.railway.app`
- Trigger un redeploy del preview branch (cualquier commit a staging branch).

## Tiempo estimado

- Setup Railway: 15-20 min
- Aplicar migrations: 5 min (si están al día, skip)
- Update Vercel preview: 5 min
- Testing post-deploy: 10 min

**Total**: ~30-40 min one-time. Después cada push a `staging` branch ejecuta el workflow de migrations + redeploya `main-api-staging` automáticamente.

## Costo adicional Railway

- Hobby plan ya incluido (~$5/mes shared).
- Service nuevo: ~$5/mes (CPU + RAM) si supera el tier hobby gratis.
- Total proyectado: $5-10/mes adicional sobre lo actual.
