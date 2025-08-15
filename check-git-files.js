#!/usr/bin/env node

/**
 * Script para verificar diferencias de case sensitivity entre el sistema de archivos y Git
 * Ejecutar con: node check-git-files.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando archivos en Git vs Sistema de archivos...\n');

// Función para obtener archivos de Git
function getGitFiles() {
  try {
    const output = execSync('git ls-files', { encoding: 'utf8' });
    return output.split('\n').filter(f => f.length > 0);
  } catch (error) {
    console.error('❌ Error al obtener archivos de Git:', error.message);
    return [];
  }
}

// Función para verificar si un archivo existe con el case exacto
function fileExistsWithCase(filePath) {
  try {
    const dir = path.dirname(filePath);
    const baseName = path.basename(filePath);
    
    // Si el directorio no existe, retornar false
    if (!fs.existsSync(dir)) {
      return false;
    }
    
    const files = fs.readdirSync(dir);
    return files.includes(baseName);
  } catch (error) {
    return false;
  }
}

// Archivos críticos a verificar
const criticalFiles = [
  'src/components/ui/Card.tsx',
  'src/components/ui/Button.tsx',
  'src/components/ui/Loading.tsx',
  'src/components/ui/Input.tsx',
  'src/components/ui/Label.tsx',
  'src/components/ui/Modal.tsx',
  'src/components/ui/Select.tsx',
  'src/components/ui/Table.tsx',
  'src/components/ui/Tabs.tsx',
  'src/components/ui/Toast.tsx',
  'src/components/ui/Toaster.tsx',
  'src/components/ui/Avatar.tsx',
  'src/components/ui/Badge.tsx',
  'src/components/ui/Dialog.tsx',
  'src/components/ui/Separator.tsx',
  'src/components/ui/index.ts',
  'src/hooks/useToast.tsx',
  'src/hooks/useAuth.ts',
  'src/hooks/useApi.ts',
  'src/hooks/useForm.ts',
  'src/hooks/useUtils.ts',
  'src/hooks/index.ts',
  'src/components/layout/Layout.tsx',
  'src/components/layout/MainLayout.tsx',
  'src/components/layout/Sidebar.tsx',
  'src/components/layout/Header.tsx',
  'src/components/layout/index.ts',
];

console.log('📋 Verificando archivos críticos:\n');

const gitFiles = getGitFiles();
const problems = [];

for (const file of criticalFiles) {
  const existsInFS = fileExistsWithCase(file);
  const existsInGit = gitFiles.some(gf => gf === file);
  const existsInGitDifferentCase = gitFiles.some(gf => gf.toLowerCase() === file.toLowerCase());
  
  if (!existsInFS) {
    console.log(`❌ ${file} - NO existe en sistema de archivos`);
    problems.push({ file, issue: 'missing-fs' });
  } else if (!existsInGit) {
    if (existsInGitDifferentCase) {
      const gitVersion = gitFiles.find(gf => gf.toLowerCase() === file.toLowerCase());
      console.log(`⚠️  ${file} - Diferente case en Git: ${gitVersion}`);
      problems.push({ file, issue: 'case-mismatch', gitVersion });
    } else {
      console.log(`⚠️  ${file} - NO está en Git`);
      problems.push({ file, issue: 'missing-git' });
    }
  } else {
    console.log(`✅ ${file}`);
  }
}

console.log('\n📊 Resumen:');
console.log(`   Total archivos verificados: ${criticalFiles.length}`);
console.log(`   Archivos con problemas: ${problems.length}`);

if (problems.length > 0) {
  console.log('\n🔧 Comandos sugeridos para arreglar:\n');
  
  // Agrupar por tipo de problema
  const missingInGit = problems.filter(p => p.issue === 'missing-git');
  const caseMismatch = problems.filter(p => p.issue === 'case-mismatch');
  
  if (missingInGit.length > 0) {
    console.log('# Agregar archivos faltantes en Git:');
    missingInGit.forEach(p => {
      console.log(`git add "${p.file}"`);
    });
    console.log('');
  }
  
  if (caseMismatch.length > 0) {
    console.log('# Arreglar problemas de case sensitivity:');
    console.log('git config core.ignorecase false');
    caseMismatch.forEach(p => {
      console.log(`git rm --cached "${p.gitVersion}"`);
      console.log(`git add "${p.file}"`);
    });
    console.log('');
  }
  
  console.log('# Después de ejecutar los comandos anteriores:');
  console.log('git commit -m "Fix file case sensitivity issues"');
  console.log('git push origin fix-deployment-issues');
} else {
  console.log('\n✨ Todos los archivos están correctamente registrados en Git!');
}

// Verificar configuración de Git
console.log('\n⚙️  Configuración actual de Git:');
try {
  const ignoreCase = execSync('git config core.ignorecase', { encoding: 'utf8' }).trim();
  console.log(`   core.ignorecase: ${ignoreCase} ${ignoreCase === 'true' ? '⚠️ (Debería ser false)' : '✅'}`);
} catch (error) {
  console.log('   core.ignorecase: no configurado');
}
