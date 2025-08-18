#!/bin/bash

echo "🔍 Verificando archivos en Git vs archivos locales..."
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📁 Archivos de UI en Git:"
git ls-files src/components/ui/ 2>/dev/null | wc -l
echo ""

echo "📁 Archivos de UI locales:"
ls -la src/components/ui/*.tsx 2>/dev/null | wc -l
echo ""

echo "📁 Archivos en src/components/layout/:"
git ls-files src/components/layout/ 2>/dev/null
echo ""

echo "📁 Archivos en src/hooks/:"
git ls-files src/hooks/ 2>/dev/null
echo ""

echo -e "${YELLOW}Archivos NO trackeados en componentes:${NC}"
git status --porcelain src/components/ | grep "^??"
echo ""

echo -e "${YELLOW}Archivos NO trackeados en hooks:${NC}"
git status --porcelain src/hooks/ | grep "^??"
echo ""

echo -e "${GREEN}✅ Agregando TODOS los archivos faltantes...${NC}"
git add src/components/ui/*.tsx
git add src/components/ui/*.ts
git add src/components/layout/*.tsx
git add src/components/layout/*.ts
git add src/hooks/*.tsx
git add src/hooks/*.ts
git add src/types/*.ts
git add src/lib/*.ts

echo ""
echo -e "${GREEN}📊 Estado actual:${NC}"
git status --short

echo ""
echo -e "${YELLOW}Para completar el fix, ejecuta:${NC}"
echo "git commit -m 'Add all missing component and hook files'"
echo "git push origin fix-deployment-issues"
