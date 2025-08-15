#!/usr/bin/env node

/**
 * Script para asegurar que todos los archivos estén en Git con el case correcto
 * Ejecutar con: node fix-git-case.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Arreglando case sensitivity en Git...\n');

// Configurar Git para ser case-sensitive
console.log('1️⃣ Configurando Git para ser case-sensitive...');
try {
  execSync('git config core.ignorecase false');
  console.log('   ✅ core.ignorecase = false\n');
} catch (error) {
  console.error('   ❌ Error:', error.message);
}

// Lista de directorios a procesar
const directories = [
  'src/components/ui',
  'src/components/layout',
  'src/hooks',
  'src/app',
];

console.log('2️⃣ Re-agregando archivos con el case correcto...\n');

directories.forEach(dir => {
  console.log(`   Procesando ${dir}...`);
  
  try {
    // Remover del caché de Git
    execSync(`git rm -r --cached ${dir} 2>nul || true`, { shell: true });
    
    // Re-agregar con el case correcto
    execSync(`git add ${dir}`);
    
    console.log(`   ✅ ${dir} re-agregado\n`);
  } catch (error) {
    console.log(`   ⚠️ ${dir}: ${error.message}\n`);
  }
});

// Verificar el estado
console.log('3️⃣ Estado actual:\n');
try {
  const status = execSync('git status --short', { encoding: 'utf8' });
  if (status) {
    console.log(status);
    console.log('\n✅ Archivos listos para commit.');
    console.log('\n📝 Ejecuta estos comandos:');
    console.log('   git commit -m "Fix case sensitivity for all files"');
    console.log('   git push origin fix-deployment-issues\n');
  } else {
    console.log('   No hay cambios pendientes.\n');
  }
} catch (error) {
  console.error('Error al obtener status:', error.message);
}
