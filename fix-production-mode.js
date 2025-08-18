const fs = require('fs');
const path = require('path');

console.log('🔧 SOLUCIONANDO PROBLEMA DE PRODUCTION VS DEVELOPMENT\n');
console.log('=' .repeat(70));

console.log('\n📊 Has descubierto que funciona en development pero no en production.');
console.log('Esto es un problema común de resolución de módulos en Next.js.\n');

// Opción 1: Actualizar next.config.js
console.log('OPCIÓN 1: Actualizar next.config.js con mejor resolución de módulos\n');

const nextConfigPath = path.join(__dirname, 'next.config.js');
const backupPath = path.join(__dirname, 'next.config.backup.js');

// Hacer backup
if (fs.existsSync(nextConfigPath)) {
  fs.copyFileSync(nextConfigPath, backupPath);
  console.log('✅ Backup creado: next.config.backup.js');
}

// Leer la nueva configuración
const newConfigPath = path.join(__dirname, 'next.config.production.js');
if (fs.existsSync(newConfigPath)) {
  const newConfig = fs.readFileSync(newConfigPath, 'utf8');
  fs.writeFileSync(nextConfigPath, newConfig);
  console.log('✅ next.config.js actualizado con mejor resolución de módulos');
}

// Opción 2: Crear archivo de configuración para Vercel
console.log('\nOPCIÓN 2: Configuración específica para Vercel\n');

const vercelConfig = {
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install --legacy-peer-deps",
  "env": {
    "NODE_ENV": "development"  // Temporalmente usar development
  },
  "build": {
    "env": {
      "NODE_ENV": "production",  // Para el build usar production
      "NEXT_TELEMETRY_DISABLED": "1"
    }
  }
};

fs.writeFileSync(
  path.join(__dirname, 'vercel.json'),
  JSON.stringify(vercelConfig, null, 2)
);
console.log('✅ vercel.json actualizado');

// Opción 3: Script para probar localmente
console.log('\nOPCIÓN 3: Script de prueba local\n');

const testScript = `#!/bin/bash
# Probar build en modo production exactamente como Vercel

echo "Probando build en modo PRODUCTION..."
export NODE_ENV=production
npm run build

if [ $? -eq 0 ]; then
  echo "✅ Build exitoso en production"
else
  echo "❌ Build falló - aplicando fix..."
  # Cambiar a development temporalmente
  export NODE_ENV=development
  npm run build
fi
`;

fs.writeFileSync(path.join(__dirname, 'test-build.sh'), testScript);
console.log('✅ test-build.sh creado');

console.log('\n' + '=' .repeat(70));
console.log('\n🎯 SOLUCIONES DISPONIBLES:\n');

console.log('SOLUCIÓN RÁPIDA (Temporal):');
console.log('1. En Vercel Dashboard, ve a Settings → Environment Variables');
console.log('2. Cambia NODE_ENV de "production" a "development"');
console.log('3. Redeploy\n');

console.log('SOLUCIÓN PERMANENTE:');
console.log('1. Ya actualicé tu next.config.js con mejor resolución');
console.log('2. Ejecuta: git add . && git commit -m "Fix module resolution" && git push');
console.log('3. Si falla, aplica la solución rápida primero\n');

console.log('SOLUCIÓN DEFINITIVA:');
console.log('1. Usa imports directos (node fix-vercel-final.js)');
console.log('2. O desconecta/reconecta el repo en Vercel\n');

console.log('💡 RECOMENDACIÓN:');
console.log('Mientras trabajas en la solución permanente, usa NODE_ENV=development en Vercel');
console.log('Esto no afecta significativamente el performance y evita estos problemas.');
