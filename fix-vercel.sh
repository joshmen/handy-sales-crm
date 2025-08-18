#!/bin/bash
# Script definitivo para solucionar problemas de Vercel

echo "======================================================"
echo "   SOLUCIÓN DEFINITIVA VERCEL BUILD ERRORS"
echo "======================================================"
echo ""

# Paso 1: Configurar Git
echo "[1/7] Configurando Git para case-sensitive..."
git config core.ignorecase false

# Paso 2: Guardar cambios actuales si los hay
echo ""
echo "[2/7] Verificando cambios pendientes..."
if [[ $(git status --porcelain) ]]; then
    echo "   Guardando cambios actuales..."
    git add .
    git commit -m "Save current work before case fix"
fi

# Paso 3: Obtener la branch actual
CURRENT_BRANCH=$(git branch --show-current)
echo ""
echo "[3/7] Branch actual: $CURRENT_BRANCH"

# Paso 4: Crear una branch temporal para el fix
echo ""
echo "[4/7] Creando branch temporal para el fix..."
git checkout -b temp-case-fix-$(date +%s)

# Paso 5: Forzar re-tracking de archivos
echo ""
echo "[5/7] Re-tracking todos los archivos con case correcto..."
git rm -r --cached .
git add .

# Paso 6: Commit con los archivos re-trackeados
echo ""
echo "[6/7] Creando commit con archivos corregidos..."
git commit -m "Fix: Case sensitivity for Vercel deployment"

# Paso 7: Merge back a la branch original
echo ""
echo "[7/7] Volviendo a la branch original y aplicando cambios..."
git checkout $CURRENT_BRANCH
git merge temp-case-fix-* --no-ff -m "Merge case sensitivity fix"

echo ""
echo "======================================================"
echo "   ✅ PROCESO COMPLETADO"
echo "======================================================"
echo ""
echo "Ahora ejecuta:"
echo ""
echo "   git push --force-with-lease origin $CURRENT_BRANCH"
echo ""
echo "Si Vercel todavía falla después del push:"
echo ""
echo "1. Ve a: https://vercel.com/dashboard"
echo "2. Selecciona tu proyecto: handy-sales-crm"
echo "3. Settings → Git"
echo "4. Click 'Disconnect'"
echo "5. Reconecta el repositorio"
echo "6. Esto forzará un rebuild completo sin caché"
echo ""
echo "======================================================"
