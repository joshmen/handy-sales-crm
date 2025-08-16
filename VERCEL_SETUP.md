# Configuración de Secrets para GitHub Actions y Vercel

## 1. Obtener los IDs de Vercel

1. Instala Vercel CLI localmente:
```bash
npm install -g vercel
```

2. Inicia sesión en Vercel:
```bash
vercel login
```

3. Link tu proyecto (en la carpeta del proyecto):
```bash
vercel link
```

4. Los IDs necesarios están en `.vercel/project.json`:
```bash
cat .vercel/project.json
```

Busca:
- `orgId` → este es tu VERCEL_ORG_ID
- `projectId` → este es tu VERCEL_PROJECT_ID

## 2. Obtener el Token de Vercel

1. Ve a: https://vercel.com/account/tokens
2. Click en "Create Token"
3. Dale un nombre como "GitHub Actions"
4. Copia el token (solo se muestra una vez)

## 3. Configurar Secrets en GitHub

Ve a tu repositorio en GitHub → Settings → Secrets and variables → Actions

Agrega estos secrets:

### Requeridos para Deployment:
- `VERCEL_ORG_ID`: (el orgId de arriba)
- `VERCEL_PROJECT_ID`: (el projectId de arriba)
- `VERCEL_TOKEN`: (el token que creaste)

### Variables de Entorno de la App:
- `NEXTAUTH_SECRET`: (genera uno con: `openssl rand -base64 32`)
- `NEXTAUTH_URL`: https://handy-sales-crm.vercel.app
- `DATABASE_URL`: (tu string de conexión a la base de datos)
- `API_URL`: (URL de tu API backend)
- `CLOUDINARY_CLOUD_NAME`: (de tu cuenta Cloudinary)
- `CLOUDINARY_API_KEY`: (de tu cuenta Cloudinary)
- `CLOUDINARY_API_SECRET`: (de tu cuenta Cloudinary)

## 4. Configurar Variables en Vercel

Ve a tu proyecto en Vercel → Settings → Environment Variables

Agrega las mismas variables:
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `DATABASE_URL`
- `NEXT_PUBLIC_API_URL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Marca las que correspondan para:
- Production
- Preview
- Development

## 5. Activar el Workflow

Una vez configurados los secrets, el workflow se activará automáticamente cuando:
- Hagas push a main (deploy a producción)
- Hagas push a develop o fix-deployment-issues (deploy a preview)
- Abras un Pull Request (deploy a preview)

## Verificación

Para verificar que todo esté configurado:

```bash
# Commit y push los cambios
git add .
git commit -m "Setup simplified Vercel deployment workflow"
git push origin fix-deployment-issues
```

Luego ve a GitHub → Actions y verifica que el workflow esté corriendo.
