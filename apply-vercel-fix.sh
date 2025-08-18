#!/bin/bash
# Solución definitiva basada en documentación de Vercel

echo "======================================================"
echo "   SOLUCIÓN DEFINITIVA - VERCEL DEPENDENCIES"
echo "======================================================"
echo ""
echo "Aplicando la solución del artículo de Vercel..."
echo "https://vercel.com/guides/dependencies-from-package-json-missing-after-install"
echo ""

# Verificar si existe vercel.json
if [ -f "vercel.json" ]; then
    echo "✅ vercel.json existe, actualizando..."
else
    echo "📝 Creando vercel.json..."
fi

# Crear/actualizar vercel.json con la solución
cat > vercel.json << 'EOF'
{
  "framework": "nextjs",
  "installCommand": "npm install --legacy-peer-deps --production=false",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "build": {
    "env": {
      "NEXT_TELEMETRY_DISABLED": "1"
    }
  },
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 10
    }
  }
}
EOF

echo "✅ vercel.json actualizado con --production=false"
echo ""
echo "La clave es: --production=false"
echo "Esto fuerza a Vercel a instalar TODAS las dependencias"
echo ""

# Hacer commit
echo "Haciendo commit de los cambios..."
git add vercel.json
git commit -m "Fix: Force install all dependencies with --production=false in Vercel"

echo ""
echo "======================================================"
echo "   ✅ LISTO - Ahora ejecuta:"
echo ""
echo "   git push"
echo ""
echo "   Esto debería resolver el problema definitivamente."
echo "======================================================"
