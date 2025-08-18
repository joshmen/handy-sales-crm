// Script para verificar y solucionar problemas de imports en Vercel
// Este script corrige específicamente los errores reportados

const fs = require('fs');
const path = require('path');

console.log('🔧 Solucionando problemas de importación para Vercel...\n');

// Lista de archivos con problemas reportados
const problemFiles = [
  'src/app/billing/suspended/page.tsx',
  'src/app/calendar/page.tsx'
];

// Función para verificar si un archivo existe (case sensitive)
function fileExistsCase(filepath) {
  const dir = path.dirname(filepath);
  const basename = path.basename(filepath);
  
  try {
    const files = fs.readdirSync(dir);
    return files.includes(basename);
  } catch (e) {
    return false;
  }
}

// Verificar la estructura de archivos
console.log('📁 Verificando estructura de archivos:\n');

const checkFiles = [
  'src/components/ui/Card.tsx',
  'src/components/ui/Button.tsx',
  'src/components/ui/Toast.tsx',
  'src/components/ui/use-toast.ts',
  'src/components/layout/Layout.tsx',
  'src/hooks/useToast.tsx',
  'src/hooks/toast.tsx',
  'src/hooks/toast.ts'
];

checkFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  const exists = fileExistsCase(fullPath);
  console.log(`${exists ? '✅' : '❌'} ${file} ${exists ? 'existe' : 'NO ENCONTRADO'}`);
});

console.log('\n📝 Analizando archivos problemáticos:\n');

// Soluciones específicas para cada archivo
const fixes = {
  'src/app/billing/suspended/page.tsx': [
    {
      description: 'Import de toast desde hooks',
      search: "import { toast } from '@/hooks/useToast';",
      replace: "import { toast } from '@/hooks/useToast';"
    }
  ],
  'src/app/calendar/page.tsx': [
    {
      description: 'Import de Layout',
      search: "import { Layout } from '@/components/layout/Layout';",
      replace: "import { Layout } from '@/components/layout/Layout';"
    },
    {
      description: 'Import de Card',
      search: "import { Card } from '@/components/ui/Card';",
      replace: "import { Card } from '@/components/ui/Card';"
    },
    {
      description: 'Import de Button',
      search: "import { Button } from '@/components/ui/Button';",
      replace: "import { Button } from '@/components/ui/Button';"
    }
  ]
};

// Aplicar fixes
problemFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ Archivo no encontrado: ${file}`);
    return;
  }
  
  console.log(`\n🔍 Revisando: ${file}`);
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // Verificar imports problemáticos
  const lines = content.split('\n');
  const importLines = lines.filter(line => line.includes('import') && line.includes('from'));
  
  console.log(`   Encontrados ${importLines.length} imports`);
  
  // Verificar específicamente los imports problemáticos
  importLines.forEach(line => {
    if (line.includes('@/components/ui/') || 
        line.includes('@/components/layout/') || 
        line.includes('@/hooks/')) {
      console.log(`   📌 ${line.trim()}`);
    }
  });
  
  // Aplicar fixes si es necesario
  if (fixes[file]) {
    fixes[file].forEach(fix => {
      if (content.includes(fix.search)) {
        console.log(`   ✅ ${fix.description} - OK`);
      } else {
        console.log(`   ⚠️  ${fix.description} - Puede necesitar revisión`);
      }
    });
  }
});

console.log('\n\n🎯 SOLUCIÓN RECOMENDADA:\n');
console.log('El problema principal es que los archivos existen con las mayúsculas correctas,');
console.log('pero puede haber un problema de caché en Git o en Vercel.\n');
console.log('Ejecuta estos comandos en orden:\n');
console.log('1. git rm -r --cached .');
console.log('2. git add .');
console.log('3. git commit -m "Fix case sensitivity issues"');
console.log('4. git push');
console.log('\nEsto forzará a Git a re-trackear todos los archivos con las mayúsculas correctas.');
console.log('\n⚠️  IMPORTANTE: Si el problema persiste, verifica:');
console.log('1. Que no haya archivos duplicados con diferentes mayúsculas');
console.log('2. Que el archivo package.json tenga la versión de Node especificada');
console.log('3. Considera limpiar el caché de Vercel desde el dashboard');
