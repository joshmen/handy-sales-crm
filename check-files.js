const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando archivos críticos...\n');

// Archivos que DEBEN existir
const criticalFiles = [
  'src/components/ui/Card.tsx',
  'src/components/ui/Button.tsx',
  'src/components/ui/Input.tsx',
  'src/components/ui/Badge.tsx',
  'src/components/ui/Dialog.tsx',
  'src/components/ui/Table.tsx',
  'src/components/ui/Tabs.tsx',
  'src/components/ui/Select.tsx',
  'src/components/ui/Avatar.tsx',
  'src/components/ui/Separator.tsx',
  'src/components/ui/index.ts',
  'src/components/layout/Layout.tsx',
  'src/hooks/useToast.tsx',
  'src/hooks/useAuth.ts',
  'src/hooks/usePermissions.tsx'
];

console.log('📁 Verificando archivos locales:');
const missingLocal = [];
criticalFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  if (!exists) missingLocal.push(file);
});

console.log('\n📦 Verificando archivos en Git:');
const missingInGit = [];
criticalFiles.forEach(file => {
  try {
    execSync(`git ls-files --error-unmatch ${file}`, { stdio: 'ignore' });
    console.log(`✅ ${file}`);
  } catch (e) {
    console.log(`❌ ${file} - NO ESTÁ EN GIT!`);
    missingInGit.push(file);
  }
});

if (missingInGit.length > 0) {
  console.log('\n⚠️  PROBLEMA DETECTADO:');
  console.log(`Hay ${missingInGit.length} archivos que NO están en Git.`);
  console.log('Esto causa el error "Module not found" en Vercel.\n');
  
  console.log('🔧 SOLUCIÓN:');
  console.log('Ejecuta estos comandos:\n');
  console.log('git add ' + missingInGit.join(' '));
  console.log('git commit -m "Add missing critical files to repository"');
  console.log('git push origin fix-deployment-issues\n');
} else if (missingLocal.length > 0) {
  console.log('\n❌ ERROR: Faltan archivos localmente!');
  console.log('Los siguientes archivos no existen:');
  missingLocal.forEach(f => console.log(`  - ${f}`));
  console.log('\nNecesitas crear estos archivos primero.');
} else {
  console.log('\n✅ Todos los archivos críticos están presentes y en Git!');
  console.log('Si aún hay errores, verifica:');
  console.log('1. Las variables de entorno en Vercel');
  console.log('2. Que hayas hecho push de los últimos cambios');
}
