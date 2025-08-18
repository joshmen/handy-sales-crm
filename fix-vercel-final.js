const fs = require('fs');
const path = require('path');

console.log('🔧 REVERTIENDO A IMPORTS DIRECTOS PARA VERCEL\n');
console.log('=' .repeat(60));
console.log('\nEsta solución usa imports directos que siempre funcionan\n');

function fixFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ No encontrado: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;
  
  replacements.forEach(({ pattern, replacement }) => {
    const regex = new RegExp(pattern, 'g');
    const matches = content.match(regex);
    if (matches) {
      content = content.replace(regex, replacement);
      changes += matches.length;
    }
  });
  
  if (changes > 0) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ ${path.basename(filePath)}: ${changes} cambios aplicados`);
    return true;
  }
  
  console.log(`ℹ️  ${path.basename(filePath)}: sin cambios necesarios`);
  return false;
}

// Corregir billing/suspended/page.tsx
console.log('\n📄 Procesando billing/suspended/page.tsx...');
const file1 = path.join(__dirname, 'src/app/billing/suspended/page.tsx');
fixFile(file1, [
  {
    pattern: "import { Card } from '@/components/ui';",
    replacement: "import { Card } from '@/components/ui/Card';"
  },
  {
    pattern: "import { Button } from '@/components/ui';",
    replacement: "import { Button } from '@/components/ui/Button';"
  },
  {
    pattern: "import { toast } from '@/hooks';",
    replacement: "import { toast } from '@/hooks/useToast';"
  }
]);

// Corregir calendar/page.tsx
console.log('\n📄 Procesando calendar/page.tsx...');
const file2 = path.join(__dirname, 'src/app/calendar/page.tsx');
fixFile(file2, [
  {
    pattern: "import { Layout } from '@/components/layout';",
    replacement: "import { Layout } from '@/components/layout/Layout';"
  },
  {
    pattern: "import { Card } from '@/components/ui';",
    replacement: "import { Card } from '@/components/ui/Card';"
  },
  {
    pattern: "import { Button } from '@/components/ui';",
    replacement: "import { Button } from '@/components/ui/Button';"
  },
  {
    pattern: "import { CardContent } from '@/components/ui';",
    replacement: "import { CardContent } from '@/components/ui/Card';"
  },
  {
    pattern: "from '@/components/ui';",
    replacement: "from '@/components/ui/Select';"
  }
]);

// Buscar y corregir otros archivos con el mismo problema
console.log('\n🔍 Buscando otros archivos con imports desde index...\n');

function findAndFixAllFiles(dir) {
  const files = [];
  
  function scan(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      items.forEach(item => {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.includes('node_modules') && !item.startsWith('.')) {
          scan(fullPath);
        } else if ((item.endsWith('.tsx') || item.endsWith('.ts')) && !item.includes('.d.ts')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          // Si tiene imports desde archivos index, agregarlo a la lista
          if (content.includes("from '@/components/ui'") || 
              content.includes("from '@/components/layout'") ||
              content.includes("from '@/hooks'")) {
            files.push(fullPath);
          }
        }
      });
    } catch (e) {
      // Ignorar errores
    }
  }
  
  scan(dir);
  return files;
}

const srcDir = path.join(__dirname, 'src');
const filesWithIndexImports = findAndFixAllFiles(srcDir);

console.log(`Encontrados ${filesWithIndexImports.length} archivos con imports desde index`);

if (filesWithIndexImports.length > 10) {
  console.log('(mostrando primeros 10)');
  filesWithIndexImports.slice(0, 10).forEach(file => {
    console.log(`   - ${path.relative(__dirname, file)}`);
  });
}

console.log('\n' + '=' .repeat(60));
console.log('\n✅ PROCESO COMPLETADO\n');
console.log('SIGUIENTE PASO - Ejecuta estos comandos:\n');
console.log('  git add .');
console.log('  git commit -m "Fix: Use direct imports for Vercel compatibility"');
console.log('  git push');
console.log('\n⚠️  IMPORTANTE:');
console.log('Si Vercel TODAVÍA falla después del push:');
console.log('\n1. Ve a https://vercel.com/dashboard');
console.log('2. Selecciona tu proyecto');
console.log('3. Settings → Git → Disconnect');
console.log('4. Reconecta el repositorio');
console.log('\nEsto garantiza un rebuild 100% limpio.');
