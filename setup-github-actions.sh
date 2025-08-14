#!/bin/bash

echo "========================================"
echo "  Configuración GitHub Actions + Vercel"
echo "========================================"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar si Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}[INFO]${NC} Instalando Vercel CLI..."
    npm i -g vercel
fi

echo -e "${BLUE}[PASO 1]${NC} Conectando con Vercel..."
echo ""
echo "Esto te pedirá login en Vercel si no estás autenticado."
echo ""

# Link con proyecto de Vercel
vercel link

# Verificar si se creó el archivo de configuración
if [ ! -f ".vercel/project.json" ]; then
    echo -e "${RED}[ERROR]${NC} No se pudo conectar con Vercel"
    echo "Por favor, ejecuta 'vercel' manualmente primero"
    exit 1
fi

echo ""
echo -e "${GREEN}[OK]${NC} Proyecto conectado con Vercel"
echo ""

# Leer los IDs del archivo project.json
echo -e "${BLUE}[PASO 2]${NC} Obteniendo IDs de Vercel..."
echo ""

# Parsear JSON
if command -v jq &> /dev/null; then
    VERCEL_ORG_ID=$(jq -r '.orgId' .vercel/project.json)
    VERCEL_PROJECT_ID=$(jq -r '.projectId' .vercel/project.json)
else
    # Fallback si no está jq instalado
    VERCEL_ORG_ID=$(grep -o '"orgId":"[^"]*' .vercel/project.json | grep -o '[^"]*$')
    VERCEL_PROJECT_ID=$(grep -o '"projectId":"[^"]*' .vercel/project.json | grep -o '[^"]*$')
fi

echo "VERCEL_ORG_ID: ${YELLOW}${VERCEL_ORG_ID}${NC}"
echo "VERCEL_PROJECT_ID: ${YELLOW}${VERCEL_PROJECT_ID}${NC}"
echo ""

# Crear archivo con instrucciones
cat > github-secrets-config.txt << EOF
========================================
  CONFIGURACIÓN DE GITHUB SECRETS
========================================

Ahora necesitas agregar estos secrets en GitHub:

1. Ve a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions
3. Agrega estos 3 secrets:

VERCEL_ORG_ID = ${VERCEL_ORG_ID}
VERCEL_PROJECT_ID = ${VERCEL_PROJECT_ID}
VERCEL_TOKEN = (crear en https://vercel.com/account/tokens)

========================================
  CREAR TOKEN DE VERCEL
========================================

1. Ve a: https://vercel.com/account/tokens
2. Click en "Create"
3. Nombre: github-actions-deployment
4. Scope: Full Account
5. Expiration: No Expiration
6. Click "Create Token"
7. COPIA el token (solo se muestra una vez)

========================================
  AGREGAR SECRETS EN GITHUB
========================================

Para cada secret en GitHub:
1. Click "New repository secret"
2. Name: VERCEL_TOKEN / VERCEL_ORG_ID / VERCEL_PROJECT_ID
3. Value: Pega el valor correspondiente
4. Click "Add secret"

========================================
EOF

echo -e "${GREEN}[OK]${NC} Archivo 'github-secrets-config.txt' creado con las instrucciones"
echo ""

# Verificar si los workflows necesitan ser committeados
if [ -n "$(git status .github/workflows --porcelain 2>/dev/null)" ]; then
    echo -e "${BLUE}[PASO 3]${NC} Agregando workflows a Git..."
    git add .github/workflows/
    git commit -m "ci: Add GitHub Actions workflows for Vercel deployment"
    echo ""
    echo -e "${GREEN}[OK]${NC} Workflows agregados al repositorio"
    echo ""
    
    read -p "¿Deseas hacer push ahora? (s/n): " push_changes
    if [ "$push_changes" = "s" ] || [ "$push_changes" = "S" ]; then
        git push
        echo -e "${GREEN}[OK]${NC} Cambios subidos a GitHub"
    fi
fi

echo ""
echo "========================================"
echo "  PRÓXIMOS PASOS"
echo "========================================"
echo ""
echo "1. Abre 'github-secrets-config.txt' para ver los IDs"
echo "2. Crea un token en: ${BLUE}https://vercel.com/account/tokens${NC}"
echo "3. Agrega los 3 secrets en GitHub Settings"
echo "4. Haz un commit para probar:"
echo "   git add ."
echo "   git commit -m \"test: GitHub Actions\""
echo "   git push"
echo "5. Ve a GitHub → Actions para ver el workflow"
echo ""
echo "========================================"
echo "  URLs IMPORTANTES"
echo "========================================"
echo ""
echo "Token Vercel: ${BLUE}https://vercel.com/account/tokens${NC}"
echo "GitHub Secrets: ${BLUE}https://github.com/TU_USUARIO/handy-sales-crm/settings/secrets/actions${NC}"
echo "GitHub Actions: ${BLUE}https://github.com/TU_USUARIO/handy-sales-crm/actions${NC}"
echo ""
