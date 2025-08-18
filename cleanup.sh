#!/bin/bash

# 🧹 Script de Limpieza para HandyCRM
# Este script elimina archivos innecesarios y temporales del proyecto

echo "🧹 Iniciando limpieza del proyecto HandyCRM..."
echo "================================================"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para confirmar acción
confirm() {
    read -p "$1 (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        return 0
    fi
    return 1
}

# Crear backup antes de limpiar
echo -e "${YELLOW}📦 Creando backup de seguridad...${NC}"
if confirm "¿Deseas crear un backup antes de limpiar?"; then
    backup_dir="backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup de archivos importantes
    cp -r .github/workflows "$backup_dir/" 2>/dev/null
    cp *.txt "$backup_dir/" 2>/dev/null
    cp *.json "$backup_dir/" 2>/dev/null
    
    echo -e "${GREEN}✅ Backup creado en: $backup_dir${NC}"
fi

echo ""
echo "🗑️  Eliminando archivos de backup (.bak)..."
echo "-------------------------------------------"

# Lista de archivos .bak a eliminar
bak_files=(
    ".github/workflows/deploy.yml.disabled.bak"
    ".github/workflows/old-deploy.yml.bak"
    ".github/workflows/old-vercel-fixed.yml.bak"
    "src/hooks/_old_usePermissions.ts.bak"
)

for file in "${bak_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  Eliminando: ${RED}$file${NC}"
        rm "$file"
    fi
done

echo ""
echo "🗑️  Eliminando workflows deshabilitados..."
echo "-------------------------------------------"

# Lista de workflows .disabled a eliminar
disabled_files=(
    ".github/workflows/ci-cd-unified.yml.disabled"
    ".github/workflows/ci.yml.disabled"
    ".github/workflows/deploy-direct.yml.disabled"
    ".github/workflows/deploy-preview.yml.disabled"
    ".github/workflows/deploy-production.yml.disabled"
    ".github/workflows/vercel-simple.yml.disabled"
    ".github/workflows/README.md"
)

for file in "${disabled_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  Eliminando: ${RED}$file${NC}"
        rm "$file"
    fi
done

echo ""
echo "⚠️  Archivos de configuración sensibles..."
echo "-------------------------------------------"

# Archivos que contienen información sensible
sensitive_files=(
    "github-secrets-config.txt"
    "vercel-env-vars.txt"
)

echo -e "${YELLOW}ADVERTENCIA: Los siguientes archivos contienen información sensible:${NC}"
for file in "${sensitive_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  - $file"
    fi
done

if confirm "¿Deseas eliminar estos archivos sensibles?"; then
    for file in "${sensitive_files[@]}"; do
        if [ -f "$file" ]; then
            echo -e "  Eliminando: ${RED}$file${NC}"
            rm "$file"
        fi
    done
fi

echo ""
echo "🧪 Eliminando archivos de prueba..."
echo "-------------------------------------------"

# Archivos y carpetas de prueba
test_files=(
    "src/app/test-toast"
    "src/app/api/mock"
    ".vercel/README.txt"
)

echo -e "${YELLOW}Los siguientes archivos/carpetas de prueba serán eliminados:${NC}"
for item in "${test_files[@]}"; do
    if [ -e "$item" ]; then
        echo -e "  - $item"
    fi
done

if confirm "¿Deseas eliminar estos archivos de prueba?"; then
    for item in "${test_files[@]}"; do
        if [ -e "$item" ]; then
            echo -e "  Eliminando: ${RED}$item${NC}"
            rm -rf "$item"
        fi
    done
fi

echo ""
echo "🎨 Limpiando assets no utilizados..."
echo "-------------------------------------------"

# SVGs por defecto de Next.js/Vercel
default_svgs=(
    "public/next.svg"
    "public/vercel.svg"
    "public/file.svg"
    "public/globe.svg"
    "public/window.svg"
)

echo -e "${YELLOW}Los siguientes SVGs parecen ser defaults de Next.js/Vercel:${NC}"
for file in "${default_svgs[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  - $file"
    fi
done

if confirm "¿Deseas eliminar estos SVGs por defecto?"; then
    for file in "${default_svgs[@]}"; do
        if [ -f "$file" ]; then
            echo -e "  Eliminando: ${RED}$file${NC}"
            rm "$file"
        fi
    done
fi

echo ""
echo "🧹 Limpiando caché de Next.js..."
echo "-------------------------------------------"

if confirm "¿Deseas limpiar el caché de Next.js (.next)?"; then
    echo -e "  Eliminando: ${RED}.next/${NC}"
    rm -rf .next
    echo -e "${GREEN}✅ Caché eliminado${NC}"
fi

echo ""
echo "📦 Limpiando node_modules..."
echo "-------------------------------------------"

if confirm "¿Deseas eliminar node_modules y reinstalar?"; then
    echo -e "  Eliminando: ${RED}node_modules/${NC}"
    rm -rf node_modules
    echo -e "  Eliminando: ${RED}package-lock.json${NC}"
    rm -f package-lock.json
    
    echo ""
    echo -e "${YELLOW}Reinstalando dependencias...${NC}"
    npm install
    echo -e "${GREEN}✅ Dependencias reinstaladas${NC}"
fi

echo ""
echo "🔍 Verificando archivos restantes..."
echo "-------------------------------------------"

# Buscar otros archivos temporales
echo "Buscando archivos temporales adicionales..."
temp_patterns=("*.tmp" "*.temp" "*.log" "*.cache" ".DS_Store" "Thumbs.db")

for pattern in "${temp_patterns[@]}"; do
    files=$(find . -name "$pattern" -type f 2>/dev/null | grep -v node_modules | grep -v .git)
    if [ ! -z "$files" ]; then
        echo -e "${YELLOW}Encontrados archivos $pattern:${NC}"
        echo "$files"
        if confirm "¿Eliminar estos archivos?"; then
            find . -name "$pattern" -type f -not -path "./node_modules/*" -not -path "./.git/*" -delete
        fi
    fi
done

echo ""
echo "📊 Resumen de limpieza"
echo "================================================"

# Mostrar espacio liberado
if command -v du &> /dev/null; then
    echo -e "${GREEN}Espacio en disco después de limpieza:${NC}"
    du -sh . 2>/dev/null
fi

echo ""
echo -e "${GREEN}✅ Limpieza completada exitosamente!${NC}"
echo ""
echo "📝 Próximos pasos recomendados:"
echo "  1. Ejecutar: git status (para ver cambios)"
echo "  2. Ejecutar: npm run build (para verificar que todo funciona)"
echo "  3. Commit de los cambios si todo está correcto"
echo ""
echo "💡 Tip: Ya se actualizó el .gitignore para prevenir subir archivos innecesarios"
