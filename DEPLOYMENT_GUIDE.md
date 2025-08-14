# 🚀 Guía de Despliegue - HandySales CRM

## 📋 Pre-requisitos
- Cuenta de GitHub
- Cuenta de Vercel
- Git instalado localmente

## 1️⃣ Configurar Git y GitHub

### Inicializar Git (si no está inicializado)
```bash
# En la carpeta handy-crm
git init
```

### Agregar archivos al repositorio
```bash
# Agregar todos los archivos
git add .

# Hacer el primer commit
git commit -m "Initial commit: HandySales CRM con sistema de membresía SaaS"
```

### Crear repositorio en GitHub
1. Ve a [GitHub](https://github.com/new)
2. Crea un nuevo repositorio llamado `handy-sales-crm`
3. NO inicialices con README, .gitignore o licencia

### Conectar con GitHub
```bash
# Reemplaza YOUR_USERNAME con tu usuario de GitHub
git remote add origin https://github.com/YOUR_USERNAME/handy-sales-crm.git

# Subir el código
git branch -M main
git push -u origin main
```

## 2️⃣ Desplegar en Vercel

### Opción A: Desde la Web de Vercel
1. Ve a [vercel.com](https://vercel.com)
2. Click en "New Project"
3. Importa tu repositorio de GitHub
4. Configura las variables de entorno (ver abajo)
5. Click en "Deploy"

### Opción B: Desde la Terminal
```bash
# Instalar Vercel CLI si no lo tienes
npm i -g vercel

# En la carpeta del proyecto
vercel

# Sigue las instrucciones:
# - Link to existing project? No
# - What's your project's name? handy-sales-crm
# - In which directory is your code located? ./
# - Want to modify settings? [y/N] n
```

## 3️⃣ Variables de Entorno en Vercel

### Variables REQUERIDAS (mínimas para funcionar)

```env
# NextAuth (IMPORTANTE: Cambiar en producción)
NEXTAUTH_URL=https://tu-dominio.vercel.app
NEXTAUTH_SECRET=genera-una-clave-segura-aqui

# API Backend (si tienes uno)
NEXT_PUBLIC_API_URL=https://tu-api-backend.com/api

# Environment
NODE_ENV=production
NEXT_PUBLIC_ENV=production
```

### Generar NEXTAUTH_SECRET
```bash
# En tu terminal, ejecuta:
openssl rand -base64 32
# Copia el resultado y úsalo como NEXTAUTH_SECRET
```

### Variables OPCIONALES (agregar según necesites)

```env
# Cloudinary (para imágenes)
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=tu-cloud-name

# Email Service (Resend)
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=noreply@tudominio.com

# Google OAuth
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx

# Stripe (pagos)
STRIPE_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
```

## 4️⃣ Configurar Variables en Vercel

### Desde la Web:
1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega cada variable con su valor
4. Selecciona los entornos (Production, Preview, Development)
5. Save

### Desde la Terminal:
```bash
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
# etc...
```

## 5️⃣ Configurar Dominio Personalizado (Opcional)

1. En Vercel → Settings → Domains
2. Add domain → ingresa tu dominio
3. Sigue las instrucciones DNS según tu proveedor

## 6️⃣ Actualizar el Proyecto

### Para futuros cambios:
```bash
# Hacer cambios en el código
git add .
git commit -m "Descripción del cambio"
git push

# Vercel detectará automáticamente el push y re-desplegará
```

## 🔥 Scripts Útiles

### Para desarrollo local:
```bash
npm run dev          # Servidor de desarrollo
npm run build        # Construir para producción
npm run start        # Iniciar servidor de producción
npm run lint         # Verificar errores de código
```

### Para mantenimiento:
```bash
npm run clean        # Limpiar caché
npm run fresh        # Reinstalar todo desde cero
```

## ⚠️ Consideraciones Importantes

### 1. Base de Datos
Actualmente usa datos mock. Para producción necesitarás:
- PostgreSQL (recomendado): Supabase, Neon, o Railway
- MongoDB: MongoDB Atlas
- MySQL: PlanetScale

### 2. Autenticación
- El NEXTAUTH_SECRET debe ser único y seguro
- Configura los callbacks URLs en proveedores OAuth

### 3. Imágenes y Archivos
- Configura Cloudinary o similar para manejo de imágenes
- Vercel tiene límites de tamaño de archivos

### 4. API Backend
- Si tienes un backend .NET, despliégalo primero
- Actualiza NEXT_PUBLIC_API_URL con la URL de producción

## 🎯 Checklist de Despliegue

- [ ] Git inicializado y conectado a GitHub
- [ ] Código subido a GitHub
- [ ] Proyecto importado en Vercel
- [ ] Variables de entorno configuradas
- [ ] NEXTAUTH_SECRET generado y configurado
- [ ] Build exitoso en Vercel
- [ ] Sitio accesible en .vercel.app
- [ ] Dominio personalizado configurado (opcional)
- [ ] SSL/HTTPS funcionando
- [ ] Pruebas básicas realizadas

## 🆘 Solución de Problemas

### Error: "Module not found"
```bash
npm install
git add package-lock.json
git commit -m "Fix: Add package-lock.json"
git push
```

### Error: "Build failed"
- Revisa los logs en Vercel
- Verifica que todas las variables de entorno estén configuradas
- Asegúrate de que no haya imports faltantes

### Error: "500 Internal Server Error"
- Verifica NEXTAUTH_SECRET y NEXTAUTH_URL
- Revisa las variables de entorno en Vercel
- Check logs en Vercel → Functions → Logs

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Vercel Dashboard
2. Verifica la consola del navegador
3. Revisa que todas las variables estén configuradas

## 🎉 ¡Listo!

Tu aplicación debería estar funcionando en:
- **Desarrollo**: http://localhost:3000
- **Producción**: https://tu-proyecto.vercel.app

---

**Última actualización**: Enero 2025
**Versión**: 1.0.0
