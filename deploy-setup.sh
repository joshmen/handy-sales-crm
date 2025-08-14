#!/bin/bash

echo "========================================"
echo "  HandySales CRM - Setup de Despliegue"
echo "========================================"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar si Git está instalado
if ! command -v git &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Git no está instalado. Por favor instala Git primero."
    echo "Instalación:"
    echo "  macOS: brew install git"
    echo "  Linux: sudo apt-get install git"
    exit 1
fi

# Verificar si ya existe un repositorio Git
if [ -d .git ]; then
    echo -e "${GREEN}[INFO]${NC} Repositorio Git ya inicializado"
else
    echo -e "${GREEN}[INFO]${NC} Inicializando repositorio Git..."
    git init
    echo -e "${GREEN}[OK]${NC} Git inicializado"
fi

# Verificar si hay cambios para commitear
if [ -n "$(git status --porcelain)" ]; then
    echo ""
    echo -e "${GREEN}[INFO]${NC} Preparando archivos para commit..."
    git add .
    
    echo ""
    read -p "Ingresa el mensaje del commit (o presiona Enter para usar el default): " commit_msg
    if [ -z "$commit_msg" ]; then
        commit_msg="Initial commit: HandySales CRM"
    fi
    
    git commit -m "$commit_msg"
    echo -e "${GREEN}[OK]${NC} Commit realizado"
fi

# Verificar si hay un remote configurado
if ! git remote | grep -q "origin"; then
    echo ""
    echo "========================================"
    echo "  Configuración de GitHub"
    echo "========================================"
    echo ""
    echo "Necesitas crear un repositorio en GitHub primero:"
    echo "1. Ve a https://github.com/new"
    echo "2. Crea un repositorio llamado 'handy-sales-crm'"
    echo "3. NO inicialices con README, .gitignore o licencia"
    echo ""
    read -p "Ingresa tu nombre de usuario de GitHub: " github_username
    
    if [ ! -z "$github_username" ]; then
        git remote add origin "https://github.com/${github_username}/handy-sales-crm.git"
        echo -e "${GREEN}[OK]${NC} Remote configurado"
        
        echo ""
        echo -e "${GREEN}[INFO]${NC} Subiendo código a GitHub..."
        git branch -M main
        git push -u origin main
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}[OK]${NC} Código subido exitosamente a GitHub"
        else
            echo -e "${RED}[ERROR]${NC} No se pudo subir el código. Verifica tus credenciales."
        fi
    fi
else
    echo -e "${GREEN}[INFO]${NC} Remote ya configurado"
    
    # Push cualquier cambio pendiente
    git push
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[OK]${NC} Cambios sincronizados con GitHub"
    fi
fi

echo ""
echo "========================================"
echo "  Generando NEXTAUTH_SECRET"
echo "========================================"
echo ""

# Generar un secret aleatorio
NEXTAUTH_SECRET=$(openssl rand -base64 32)

echo "Tu NEXTAUTH_SECRET generado es:"
echo ""
echo -e "${YELLOW}${NEXTAUTH_SECRET}${NC}"
echo ""
echo -e "${RED}[IMPORTANTE]${NC} Guarda este secret de forma segura!"
echo "Lo necesitarás para configurar las variables de entorno en Vercel."

# Crear archivo con las variables de entorno para Vercel
echo ""
echo "========================================"
echo "  Creando archivo de variables"
echo "========================================"
echo ""

cat > vercel-env-vars.txt << EOF
# Variables de Entorno para Vercel
# Copia estas variables en Vercel Dashboard

NEXTAUTH_URL=https://tu-proyecto.vercel.app
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
NODE_ENV=production
NEXT_PUBLIC_ENV=production

# Si tienes API Backend:
# NEXT_PUBLIC_API_URL=https://tu-api.com/api

# Opcionales:
# CLOUDINARY_CLOUD_NAME=
# CLOUDINARY_API_KEY=
# CLOUDINARY_API_SECRET=
# RESEND_API_KEY=
# STRIPE_SECRET_KEY=
EOF

echo -e "${GREEN}[OK]${NC} Archivo 'vercel-env-vars.txt' creado con las variables de entorno"

echo ""
echo "========================================"
echo "  Verificando Vercel CLI"
echo "========================================"
echo ""

# Verificar si Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}[INFO]${NC} Vercel CLI no está instalado"
    echo ""
    read -p "¿Deseas instalar Vercel CLI ahora? (s/n): " install_vercel
    
    if [ "$install_vercel" = "s" ] || [ "$install_vercel" = "S" ]; then
        echo -e "${GREEN}[INFO]${NC} Instalando Vercel CLI..."
        npm i -g vercel
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}[OK]${NC} Vercel CLI instalado"
        else
            echo -e "${RED}[ERROR]${NC} No se pudo instalar Vercel CLI"
        fi
    fi
else
    echo -e "${GREEN}[OK]${NC} Vercel CLI ya está instalado"
fi

echo ""
echo "========================================"
echo "  Próximos Pasos"
echo "========================================"
echo ""
echo "1. Ve a https://vercel.com y haz login"
echo "2. Click en 'New Project'"
echo "3. Importa tu repositorio: handy-sales-crm"
echo "4. Configura las variables de entorno del archivo 'vercel-env-vars.txt'"
echo "5. Click en 'Deploy'"
echo ""
echo "O usa Vercel CLI ejecutando: vercel"
echo ""
echo "========================================"
echo -e "  ${GREEN}¡Setup Completado!${NC}"
echo "========================================"
echo ""
