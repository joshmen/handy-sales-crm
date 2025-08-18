#!/bin/bash

# Script para diagnosticar y arreglar problemas de importación en Vercel
# Este script identifica y corrige problemas de case sensitivity en Linux

echo "🔍 Diagnosticando problemas de importación..."

# Verificar archivos problemáticos
echo ""
echo "📁 Verificando estructura de archivos UI:"
ls -la src/components/ui/ | grep -E "(Card|Button|Toast|use-toast)"

echo ""
echo "📁 Verificando estructura de archivos hooks:"
ls -la src/hooks/ | grep -E "(toast|Toast|useToast)"

echo ""
echo "📁 Verificando estructura de archivos layout:"
ls -la src/components/layout/ | grep -E "(Layout|MainLayout)"

# Buscar imports problemáticos
echo ""
echo "🔎 Buscando imports potencialmente problemáticos..."

# Buscar imports de Card y Button
echo ""
echo "Imports de Card:"
grep -r "@/components/ui/Card" src/ --include="*.tsx" --include="*.ts" | head -5

echo ""
echo "Imports de Button:"
grep -r "@/components/ui/Button" src/ --include="*.tsx" --include="*.ts" | head -5

echo ""
echo "Imports de toast desde hooks:"
grep -r "@/hooks/useToast" src/ --include="*.tsx" --include="*.ts" | head -5

echo ""
echo "Imports de toast desde ui:"
grep -r "@/components/ui/use-toast" src/ --include="*.tsx" --include="*.ts" | head -5

echo ""
echo "Imports de Layout:"
grep -r "@/components/layout/Layout" src/ --include="*.tsx" --include="*.ts" | head -5

echo ""
echo "✅ Diagnóstico completado."
echo ""
echo "📝 RECOMENDACIONES:"
echo "1. Asegúrate de que todos los imports coincidan exactamente con los nombres de archivo (case sensitive)"
echo "2. Considera usar exports centralizados desde index.ts en cada carpeta"
echo "3. Para toast, usa consistentemente desde @/hooks/useToast o @/components/ui"
echo "4. Ejecuta 'npm run build' localmente en WSL o Linux para detectar estos errores antes de hacer push"
