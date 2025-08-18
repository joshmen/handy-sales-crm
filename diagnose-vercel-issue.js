const fs = require('fs');
const path = require('path');

console.log('🔍 DIAGNÓSTICO COMPLETO DEL PROBLEMA\n');
console.log('=' .repeat(70));

// 1. Verificar archivos index
console.log('\n📁 VERIFICANDO ARCHIVOS INDEX:\n');

const indexFiles = [
  'src/components/ui/index.ts',
  'src/components/layout/index.ts',
  'src/hooks/index.ts',
  'src/components/calendar/index.ts'
];

const missingIndexes = [];

indexFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    const stats = fs.statSync(fullPath);
    console.log(`✅ ${file}`);
    console.log(`   Tamaño: ${stats.size} bytes`);
    console.log(`   Modificado: ${stats.mtime}`);
  } else {
    console.log(`❌ ${file} - NO EXISTE`);
    missingIndexes.push(file);
  }
});

// 2. Verificar el contenido de los archivos que sí existen
console.log('\n📝 CONTENIDO DE ARCHIVOS INDEX:\n');

indexFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    console.log(`\n${file}:`);
    console.log(`   Líneas de código: ${lines.length}`);
    console.log(`   Primeras exportaciones:`);
    lines.slice(0, 3).forEach(line => {
      if (line.length > 60) {
        console.log(`     ${line.substring(0, 60)}...`);
      } else {
        console.log(`     ${line}`);
      }
    });
  }
});

// 3. Verificar archivos problemáticos
console.log('\n🔍 ARCHIVOS CON ERRORES EN VERCEL:\n');

const problemFiles = [
  'src/app/billing/suspended/page.tsx',
  'src/app/calendar/page.tsx'
];

problemFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    console.log(`\n${file}:`);
    
    // Buscar imports
    lines.forEach((line, idx) => {
      if (line.includes('import') && line.includes('from') && idx < 20) {
        if (line.includes('@/components/ui') || 
            line.includes('@/components/layout') || 
            line.includes('@/hooks')) {
          console.log(`   Línea ${idx + 1}: ${line.trim()}`);
        }
      }
    });
  }
});

// 4. Verificar si hay un archivo calendar/CalendarView
console.log('\n📁 VERIFICANDO COMPONENTE CalendarView:\n');

const calendarViewPath = 'src/components/calendar/CalendarView.tsx';
if (fs.existsSync(path.join(__dirname, calendarViewPath))) {
  console.log(`✅ ${calendarViewPath} existe`);
} else {
  console.log(`❌ ${calendarViewPath} NO EXISTE`);
  
  // Buscar archivos similares
  const calendarDir = path.join(__dirname, 'src/components/calendar');
  if (fs.existsSync(calendarDir)) {
    const files = fs.readdirSync(calendarDir);
    console.log('\n   Archivos en src/components/calendar:');
    files.forEach(f => console.log(`     - ${f}`));
  }
}

// 5. Verificar que Git está trackeando los archivos index
console.log('\n📋 VERIFICANDO GIT STATUS:\n');

const { execSync } = require('child_process');

try {
  // Verificar si los archivos index están en Git
  const gitFiles = execSync('git ls-files', { encoding: 'utf8' });
  const trackedIndexFiles = indexFiles.filter(file => gitFiles.includes(file));
  
  console.log(`Archivos index trackeados por Git: ${trackedIndexFiles.length}/${indexFiles.length}`);
  
  indexFiles.forEach(file => {
    if (gitFiles.includes(file)) {
      console.log(`   ✅ ${file} - En Git`);
    } else {
      console.log(`   ❌ ${file} - NO está en Git`);
    }
  });
} catch (e) {
  console.log('   ⚠️  No se pudo verificar el estado de Git');
}

// 6. Crear script de solución
console.log('\n💡 GENERANDO SOLUCIÓN:\n');

// Script para revertir a imports directos (solución temporal)
const revertScript = `const fs = require('fs');
const path = require('path');

console.log('🔄 Revirtiendo a imports directos temporalmente...\\n');

// Archivo 1: billing/suspended/page.tsx
const file1 = path.join(__dirname, 'src/app/billing/suspended/page.tsx');
if (fs.existsSync(file1)) {
  let content = fs.readFileSync(file1, 'utf8');
  
  // Reemplazar imports de ui
  content = content.replace(
    "import { Card } from '@/components/ui';",
    "import { Card } from '@/components/ui/Card';"
  );
  content = content.replace(
    "import { Button } from '@/components/ui';",
    "import { Button } from '@/components/ui/Button';"
  );
  
  // Reemplazar import de hooks
  content = content.replace(
    "import { toast } from '@/hooks';",
    "import { toast } from '@/hooks/useToast';"
  );
  
  fs.writeFileSync(file1, content);
  console.log('✅ Revertido: src/app/billing/suspended/page.tsx');
}

// Archivo 2: calendar/page.tsx
const file2 = path.join(__dirname, 'src/app/calendar/page.tsx');
if (fs.existsSync(file2)) {
  let content = fs.readFileSync(file2, 'utf8');
  
  // Reemplazar imports
  content = content.replace(
    "import { Layout } from '@/components/layout';",
    "import { Layout } from '@/components/layout/Layout';"
  );
  content = content.replace(
    "import { Card } from '@/components/ui';",
    "import { Card } from '@/components/ui/Card';"
  );
  content = content.replace(
    "import { Button } from '@/components/ui';",
    "import { Button } from '@/components/ui/Button';"
  );
  content = content.replace(
    "import { CardContent } from '@/components/ui';",
    "import { CardContent } from '@/components/ui/Card';"
  );
  
  fs.writeFileSync(file2, content);
  console.log('✅ Revertido: src/app/calendar/page.tsx');
}

console.log('\\n✅ Listo. Ahora ejecuta:');
console.log('   git add .');
console.log('   git commit -m "Revert to direct imports for Vercel compatibility"');
console.log('   git push');
`;

fs.writeFileSync(path.join(__dirname, 'revert-to-direct-imports.js'), revertScript);
console.log('✅ Script creado: revert-to-direct-imports.js');

// 7. Resumen final
console.log('\n' + '=' .repeat(70));
console.log('\n🎯 SOLUCIONES DISPONIBLES:\n');

console.log('OPCIÓN 1: Revertir a imports directos (más rápido)');
console.log('   node revert-to-direct-imports.js');
console.log('   git add .');
console.log('   git commit -m "Use direct imports"');
console.log('   git push');

console.log('\nOPCIÓN 2: Nuclear - Limpiar todo el caché de Git');
console.log('   git rm -r --cached .');
console.log('   git add .');
console.log('   git commit -m "Reset Git cache"');
console.log('   git push --force-with-lease');

console.log('\nOPCIÓN 3: Desconectar/Reconectar en Vercel (100% efectivo)');
console.log('   1. Ve a vercel.com → tu proyecto');
console.log('   2. Settings → Git → Disconnect');
console.log('   3. Reconecta el repositorio');

console.log('\n' + '=' .repeat(70));
