# 🚀 Guía Completa de Despliegue en Azure - HandySuites

## 📋 Pre-requisitos

### 1. **Cuentas Necesarias**
- [ ] Cuenta de Azure (con suscripción activa o trial)
- [ ] Cuenta de GitHub (para el código)
- [ ] Cuenta de Docker Hub (para las imágenes)
- [ ] Cuenta de Vercel (ya la tienes para el frontend)

### 2. **Herramientas Locales**
```bash
# Instalar Azure CLI
# Windows (PowerShell como Admin)
winget install Microsoft.AzureCLI

# O descarga desde: https://aka.ms/installazurecliwindows

# Verificar instalación
az --version

# Instalar Docker Desktop
# Descargar desde: https://www.docker.com/products/docker-desktop/
```

---

## 🎯 PASO 1: Preparación Local

### 1.1 Clonar y preparar el proyecto
```bash
# En tu terminal Git Bash o PowerShell
cd C:\Users\AW AREA 51M R2\OneDrive\Offshore_Projects\HandySuites

# Verificar estructura
ls -la
```

### 1.2 Construir imágenes Docker localmente
```bash
# Construir API Principal
cd HandySuites
docker build -f azure/Dockerfile.Main -t handysuites/api-main:latest .

# Construir API Facturación
docker build -f azure/Dockerfile.Billing -t handysuites/api-billing:latest .

# Verificar imágenes
docker images
```

---

## 🔐 PASO 2: Configurar Azure

### 2.1 Login en Azure CLI
```bash
# Abrir PowerShell o CMD
az login

# Se abrirá el navegador, inicia sesión con tu cuenta Azure
# Verás algo como:
# [
#   {
#     "cloudName": "AzureCloud",
#     "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
#     "isDefault": true,
#     "name": "Tu Suscripción",
#     "state": "Enabled",
#     "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
#     "user": {
#       "name": "tu-email@example.com",
#       "type": "user"
#     }
#   }
# ]
```

### 2.2 Crear Resource Group
```bash
# Crear grupo de recursos (contenedor para todos tus servicios)
az group create --name handysuites-rg --location eastus2

# Verificar
az group show --name handysuites-rg
```

---

## 💾 PASO 3: Crear Base de Datos MySQL

### 3.1 Crear MySQL Flexible Server
```bash
# IMPORTANTE: Guarda estas contraseñas en un lugar seguro
$MYSQL_PASSWORD = "TuPassword123!@#"  # Cambia esto
$JWT_SECRET = "TuSuperSecretKeyDe32CaracteresMinimo123456"  # Cambia esto

# Crear servidor MySQL (más barato)
az mysql flexible-server create `
  --resource-group handysuites-rg `
  --name handysuites-mysql `
  --location eastus2 `
  --admin-user handyadmin `
  --admin-password $MYSQL_PASSWORD `
  --sku-name Standard_B1s `
  --tier Burstable `
  --storage-size 20 `
  --version 8.0 `
  --public-access 0.0.0.0-255.255.255.255

# Esto tardará 5-10 minutos...
```

### 3.2 Crear las bases de datos
```bash
# Obtener el FQDN del servidor
$MYSQL_HOST = az mysql flexible-server show `
  --resource-group handysuites-rg `
  --name handysuites-mysql `
  --query fullyQualifiedDomainName -o tsv

echo "Tu servidor MySQL está en: $MYSQL_HOST"

# Conectar y crear bases de datos
# Opción 1: Usar Azure Cloud Shell (más fácil)
# Ve a: https://portal.azure.com
# Click en el ícono >_ (Cloud Shell) arriba a la derecha
# Ejecuta:
mysql -h handysuites-mysql.mysql.database.azure.com -u handyadmin -p

# Cuando te pida password, usa el que definiste arriba
# Luego ejecuta:
CREATE DATABASE handy_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE handy_billing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### 3.3 Ejecutar scripts de inicialización
```bash
# Desde tu máquina local (PowerShell)
# Navega a la carpeta del proyecto
cd C:\Users\AW AREA 51M R2\OneDrive\Offshore_Projects\HandySuites

# Ejecutar script de base principal
mysql -h handysuites-mysql.mysql.database.azure.com -u handyadmin -p handy_erp < BaseDeDatos/InitialSchema.sql

# Ejecutar script de facturación
mysql -h handysuites-mysql.mysql.database.azure.com -u handyadmin -p handy_billing < BaseDeDatos/BillingSchema.sql

# Ejecutar script de admin inicial
mysql -h handysuites-mysql.mysql.database.azure.com -u handyadmin -p < azure/init-database.sql
```

---

## 🐳 PASO 4: Subir Imágenes a Azure Container Registry

### 4.1 Crear Container Registry
```bash
# Crear registro de contenedores
az acr create `
  --resource-group handysuites-rg `
  --name handysuitesacr `
  --sku Basic `
  --admin-enabled true

# Obtener credenciales
az acr credential show --name handysuitesacr
# Guarda el username y password que aparecen
```

### 4.2 Subir imágenes
```bash
# Login en ACR
az acr login --name handysuitesacr

# Etiquetar imágenes
docker tag handysuites/api-main:latest handysuitesacr.azurecr.io/api-main:latest
docker tag handysuites/api-billing:latest handysuitesacr.azurecr.io/api-billing:latest

# Push a Azure
docker push handysuitesacr.azurecr.io/api-main:latest
docker push handysuitesacr.azurecr.io/api-billing:latest
```

---

## 📦 PASO 5: Desplegar Container Instances

### 5.1 Crear archivo de configuración
```bash
# Crear archivo temporal con variables
cd C:\Users\AW AREA 51M R2\OneDrive\Offshore_Projects\HandySuites\azure

# Editar container-instances.yml con tus valores reales
notepad container-instances-prod.yml
```

Copia y pega esto, reemplazando los valores:
```yaml
apiVersion: 2019-12-01
location: eastus2
name: handysuites-containers
properties:
  containers:
  - name: api-main
    properties:
      image: handysuitesacr.azurecr.io/api-main:latest
      resources:
        requests:
          memoryInGB: 0.5
          cpu: 0.1
      environmentVariables:
      - name: ConnectionStrings__DefaultConnection
        value: "Server=handysuites-mysql.mysql.database.azure.com;Database=handy_erp;User=handyadmin;Password=TU_PASSWORD_AQUI;SslMode=Required;"
      - name: JWT__SecretKey
        value: "TU_JWT_SECRET_AQUI"
      ports:
      - port: 5000
  
  - name: api-billing
    properties:
      image: handysuitesacr.azurecr.io/api-billing:latest
      resources:
        requests:
          memoryInGB: 0.5
          cpu: 0.1
      environmentVariables:
      - name: ConnectionStrings__BillingConnection
        value: "Server=handysuites-mysql.mysql.database.azure.com;Database=handy_billing;User=handyadmin;Password=TU_PASSWORD_AQUI;SslMode=Required;"
      ports:
      - port: 5001

  osType: Linux
  ipAddress:
    type: Public
    ports:
    - protocol: TCP
      port: 5000
    - protocol: TCP
      port: 5001
    dnsNameLabel: handysuites-api

  imageRegistryCredentials:
  - server: handysuitesacr.azurecr.io
    username: handysuitesacr
    password: "TU_ACR_PASSWORD_AQUI"
```

### 5.2 Desplegar
```bash
# Desplegar container instances
az container create `
  --resource-group handysuites-rg `
  --file container-instances-prod.yml

# Verificar estado
az container show `
  --resource-group handysuites-rg `
  --name handysuites-containers `
  --query instanceView.state

# Obtener IP pública
az container show `
  --resource-group handysuites-rg `
  --name handysuites-containers `
  --query ipAddress.ip -o tsv
```

---

## ✅ PASO 6: Verificar y Configurar Frontend

### 6.1 Verificar APIs
```bash
# Reemplaza XX.XX.XX.XX con tu IP de Azure
curl http://XX.XX.XX.XX:5000/health
curl http://XX.XX.XX.XX:5001/health

# Ver Swagger
# Abre en navegador:
http://XX.XX.XX.XX:5000/swagger
http://XX.XX.XX.XX:5001/swagger
```

### 6.2 Actualizar Frontend en Vercel
```javascript
// En tu proyecto Next.js (handy-crm)
// Crear archivo .env.production
NEXT_PUBLIC_API_URL=http://XX.XX.XX.XX:5000
NEXT_PUBLIC_BILLING_API_URL=http://XX.XX.XX.XX:5001
```

```bash
# Commit y push
git add .
git commit -m "Update API URLs for production"
git push

# Vercel se actualizará automáticamente
```

---

## 🔧 PASO 7: Monitoreo y Mantenimiento

### Ver logs
```bash
# Ver logs de containers
az container logs `
  --resource-group handysuites-rg `
  --name handysuites-containers `
  --container-name api-main

# Ver métricas
az monitor metrics list `
  --resource handysuites-containers `
  --resource-group handysuites-rg `
  --resource-type Microsoft.ContainerInstance/containerGroups `
  --metric CPUUsage
```

### Reiniciar si es necesario
```bash
az container restart `
  --resource-group handysuites-rg `
  --name handysuites-containers
```

---

## 💰 Verificar Costos

```bash
# Ver costos actuales
az consumption usage list `
  --start-date 2025-01-01 `
  --end-date 2025-01-31 `
  --query "[?contains(resourceGroup, 'handysuites')]"

# Configurar alerta de presupuesto
az consumption budget create `
  --budget-name handysuites-budget `
  --resource-group handysuites-rg `
  --amount 35 `
  --time-grain Monthly `
  --category Cost
```

---

## 🆘 Solución de Problemas

### Si la base de datos no conecta:
```bash
# Verificar firewall
az mysql flexible-server firewall-rule create `
  --resource-group handysuites-rg `
  --name handysuites-mysql `
  --rule-name AllowAllAzureIPs `
  --start-ip-address 0.0.0.0 `
  --end-ip-address 0.0.0.0
```

### Si los containers no inician:
```bash
# Ver eventos
az container show `
  --resource-group handysuites-rg `
  --name handysuites-containers `
  --query events
```

### Si necesitas eliminar todo (para rehacer):
```bash
# CUIDADO: Esto borra TODO
az group delete --name handysuites-rg --yes --no-wait
```

---

## 📞 Soporte

### Necesitas ayuda? Aquí estoy para guiarte:

1. **Error específico**: Copia el mensaje de error completo
2. **En qué paso estás**: Dime el número de paso
3. **Qué comando ejecutaste**: Copia el comando exacto
4. **Qué resultado obtuviste**: Screenshot o texto del resultado

### Recursos útiles:
- [Portal Azure](https://portal.azure.com) - Ver todo visualmente
- [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/) - Estimar costos
- [Azure Status](https://status.azure.com/) - Ver si hay problemas con Azure

---

## 🎉 ¡LISTO!

Cuando todo esté funcionando tendrás:
- ✅ APIs corriendo en Azure Container Instances
- ✅ Base de datos MySQL en Azure
- ✅ Frontend en Vercel
- ✅ Todo por ~$30-35 USD/mes

**URLs finales:**
- API Principal: `http://handysuites-api.eastus2.azurecontainer.io:5000`
- API Facturación: `http://handysuites-api.eastus2.azurecontainer.io:5001`
- Frontend: `https://tu-app.vercel.app`