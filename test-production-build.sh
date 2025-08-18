#!/bin/bash
# Script para probar build en modo production como lo hace Vercel

echo "======================================================"
echo "   PROBANDO BUILD EN MODO PRODUCTION (COMO VERCEL)"
echo "======================================================"
echo ""

# Limpiar builds anteriores
echo "[1] Limpiando builds anteriores..."
rm -rf .next
rm -rf out

# Configurar variables de entorno como Vercel
echo ""
echo "[2] Configurando entorno PRODUCTION..."
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

echo "   NODE_ENV=$NODE_ENV"
echo ""

# Ejecutar build
echo "[3] Ejecutando build en modo PRODUCTION..."
echo ""
npm run build

# Verificar resultado
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ BUILD EXITOSO EN MODO PRODUCTION"
    echo ""
    echo "Esto significa que el problema es específico de Vercel."
else
    echo ""
    echo "❌ BUILD FALLÓ EN MODO PRODUCTION"
    echo ""
    echo "El problema se puede reproducir localmente."
    echo "Esto confirma que es un problema de resolución de módulos."
fi

echo ""
echo "======================================================"
echo "   SIGUIENTE PASO"
echo "======================================================"
echo ""
echo "Si el build falló, ejecuta:"
echo "  node fix-module-resolution.js"
echo ""
echo "Si el build funcionó, el problema es de Vercel y necesitas:"
echo "  1. Cambiar NODE_ENV a development en Vercel temporalmente"
echo "  2. O usar la solución de imports directos"
echo ""
