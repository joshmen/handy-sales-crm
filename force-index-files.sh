#!/bin/bash
# Script para verificar y forzar el commit de archivos index

echo "======================================================"
echo "   VERIFICACIÓN Y FIX DE ARCHIVOS INDEX"
echo "======================================================"
echo ""

# Verificar que los archivos index existen
echo "[1] Verificando archivos index..."
echo ""

files_to_check=(
  "src/components/ui/index.ts"
  "src/components/layout/index.ts"
  "src/hooks/index.ts"
)

for file in "${files_to_check[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file existe"
  else
    echo "❌ $file NO EXISTE"
  fi
done

echo ""
echo "[2] Verificando estado en Git..."
echo ""

# Ver qué archivos están en el staging area
git ls-files | grep -E "(index\.ts|index\.js)" | head -20

echo ""
echo "[3] Forzando Git a reconocer los archivos index..."
echo ""

# Configurar Git para case sensitive
git config core.ignorecase false

# Remover específicamente los archivos index del cache
git rm --cached src/components/ui/index.ts 2>/dev/null
git rm --cached src/components/layout/index.ts 2>/dev/null
git rm --cached src/hooks/index.ts 2>/dev/null

# Re-agregar los archivos index
git add src/components/ui/index.ts
git add src/components/layout/index.ts
git add src/hooks/index.ts

# Verificar que se agregaron
echo ""
echo "[4] Verificando que los archivos están en staging..."
git status --short | grep index.ts

echo ""
echo "[5] Creando commit con los archivos index..."
git commit -m "Force add index.ts files for module resolution"

echo ""
echo "======================================================"
echo "   LISTO - Ahora ejecuta:"
echo ""
echo "   git push --force-with-lease"
echo ""
echo "======================================================"
