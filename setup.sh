#!/bin/bash

# Setup script para HandySales CRM

echo "🚀 Configurando HandySales CRM..."
echo "================================"

# Verificar Node.js
echo "✔️ Verificando Node.js..."
node_version=$(node -v)
echo "   Node.js version: $node_version"

# Verificar npm
echo "✔️ Verificando npm..."
npm_version=$(npm -v)
echo "   npm version: $npm_version"

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Copiar archivo de environment
if [ ! -f .env.local ]; then
    echo "📝 Creando archivo .env.local..."
    cp .env.example .env.local
    echo "   ⚠️  Por favor, actualiza .env.local con tus configuraciones"
fi

# Build inicial
echo "🔨 Ejecutando build inicial..."
npm run build

echo ""
echo "✅ ¡Setup completado!"
echo "================================"
echo ""
echo "Próximos pasos:"
echo "1. Actualiza el archivo .env.local con tu configuración"
echo "2. Asegúrate de que el backend .NET esté ejecutándose"
echo "3. Ejecuta 'npm run dev' para iniciar el servidor de desarrollo"
echo ""
echo "Para producción:"
echo "- Conecta el repositorio con Vercel"
echo "- Configura las variables de entorno en Vercel"
echo "- Push a la rama main para desplegar automáticamente"
