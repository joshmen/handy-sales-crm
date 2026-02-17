#!/bin/bash
# Script de despliegue para Azure - Configuración económica
# Ejecutar: chmod +x deployment-script.sh && ./deployment-script.sh

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== HandySales - Despliegue Azure Económico ===${NC}"

# Variables de configuración
RESOURCE_GROUP="handysales-rg"
LOCATION="eastus2"  # Región más barata
MYSQL_SERVER="handysales-mysql"
MYSQL_ADMIN="handyadmin"
STORAGE_ACCOUNT="handysalesstorage$(date +%s)"
CONTAINER_GROUP="handysales-containers"

# Solicitar contraseñas
echo -e "${YELLOW}Configuración de seguridad:${NC}"
read -s -p "Ingresa contraseña para MySQL (mín. 8 caracteres): " MYSQL_PASSWORD
echo
read -s -p "Ingresa clave secreta JWT (mín. 32 caracteres): " JWT_SECRET
echo
echo

# Validar Azure CLI
echo -e "${BLUE}1. Verificando Azure CLI...${NC}"
if ! command -v az &> /dev/null; then
    echo -e "${RED}Azure CLI no está instalado. Instala desde: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli${NC}"
    exit 1
fi

# Login a Azure
echo -e "${BLUE}2. Verificando autenticación Azure...${NC}"
if ! az account show &> /dev/null; then
    echo "Iniciando sesión en Azure..."
    az login
fi

# Crear Resource Group
echo -e "${BLUE}3. Creando Resource Group: $RESOURCE_GROUP${NC}"
az group create --name $RESOURCE_GROUP --location $LOCATION

# Crear Storage Account para configuraciones
echo -e "${BLUE}4. Creando Storage Account: $STORAGE_ACCOUNT${NC}"
az storage account create \
    --name $STORAGE_ACCOUNT \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --sku Standard_LRS \
    --kind StorageV2 \
    --access-tier Cool  # Tier frío para ahorrar

# Obtener Storage Key
STORAGE_KEY=$(az storage account keys list \
    --resource-group $RESOURCE_GROUP \
    --account-name $STORAGE_ACCOUNT \
    --query '[0].value' -o tsv)

# Crear File Share para nginx config
echo -e "${BLUE}5. Creando File Share para configuraciones...${NC}"
az storage share create \
    --name nginx-config \
    --account-name $STORAGE_ACCOUNT \
    --account-key $STORAGE_KEY \
    --quota 1  # 1GB mínimo

# Crear base de datos MySQL
echo -e "${BLUE}6. Desplegando Azure Database for MySQL...${NC}"
az deployment group create \
    --resource-group $RESOURCE_GROUP \
    --template-file mysql-database.bicep \
    --parameters serverName=$MYSQL_SERVER \
                 administratorLogin=$MYSQL_ADMIN \
                 administratorLoginPassword="$MYSQL_PASSWORD" \
                 location=$LOCATION

echo -e "${GREEN}✓ Base de datos MySQL creada${NC}"

# Obtener FQDN de la base de datos
MYSQL_FQDN=$(az mysql flexible-server show \
    --resource-group $RESOURCE_GROUP \
    --name $MYSQL_SERVER \
    --query "fullyQualifiedDomainName" -o tsv)

echo -e "${BLUE}7. Inicializando base de datos...${NC}"
# Aquí deberías ejecutar los scripts SQL para crear tablas
echo "Conectar manualmente a: $MYSQL_FQDN"
echo "Usuario: $MYSQL_ADMIN"
echo "Ejecutar scripts: InitialSchema.sql, BillingSchema.sql"

# Crear nginx configuration
echo -e "${BLUE}8. Configurando Nginx...${NC}"
cat > nginx.conf << 'EOL'
events {
    worker_connections 1024;
}

http {
    upstream api_main {
        server localhost:5000;
    }
    
    upstream api_billing {
        server localhost:5001;
    }
    
    server {
        listen 80;
        server_name _;
        
        # API Principal
        location /api/v1/ {
            proxy_pass http://api_main/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # API Facturación
        location /api/billing/ {
            proxy_pass http://api_billing/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Health check
        location /health {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
    }
}
EOL

# Subir configuración nginx
az storage file upload \
    --share-name nginx-config \
    --account-name $STORAGE_ACCOUNT \
    --account-key $STORAGE_KEY \
    --source nginx.conf \
    --path nginx.conf

# Actualizar Container Instances YAML con variables
echo -e "${BLUE}9. Preparando Container Instances...${NC}"
export MYSQL_PASSWORD JWT_SECRET STORAGE_KEY
envsubst < container-instances.yml > container-instances-final.yml

echo -e "${BLUE}10. Desplegando Container Instances...${NC}"
az container create --file container-instances-final.yml --resource-group $RESOURCE_GROUP

# Obtener IP pública
CONTAINER_IP=$(az container show \
    --resource-group $RESOURCE_GROUP \
    --name $CONTAINER_GROUP \
    --query "ipAddress.ip" -o tsv)

# Información final
echo -e "${GREEN}"
echo "=== DESPLIEGUE COMPLETADO ==="
echo "Resource Group: $RESOURCE_GROUP"
echo "MySQL Server: $MYSQL_FQDN"
echo "Container IP: $CONTAINER_IP"
echo "URL API Principal: http://$CONTAINER_IP/api/v1/"
echo "URL API Facturación: http://$CONTAINER_IP/api/billing/"
echo "Swagger: http://$CONTAINER_IP/swagger"
echo ""
echo "COSTO ESTIMADO MENSUAL:"
echo "- Container Instances: ~$8-12"
echo "- MySQL B1s: ~$15"
echo "- Storage: ~$1"
echo "- Total: ~$24-28 USD/mes"
echo -e "${NC}"

# Limpiar archivos temporales
rm -f nginx.conf container-instances-final.yml

echo -e "${YELLOW}PRÓXIMOS PASOS:${NC}"
echo "1. Conecta a MySQL y ejecuta scripts SQL"
echo "2. Sube imágenes Docker a Azure Container Registry"
echo "3. Actualiza el Frontend en Vercel con las nuevas URLs"
echo "4. Configura SSL con Let's Encrypt"