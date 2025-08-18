const fs = require('fs');
const path = require('path');

console.log('🔧 Solución alternativa: Actualizando imports para usar archivos index\n');
console.log('=' .repeat(70));

// Archivos que necesitan ser actualizados según los errores de Vercel
const filesToFix = [
  {
    path: 'src/app/billing/suspended/page.tsx',
    replacements: [
      {
        from: "import { Card } from '@/components/ui/Card';",
        to: "import { Card } from '@/components/ui';"
      },
      {
        from: "import { Button } from '@/components/ui/Button';",
        to: "import { Button } from '@/components/ui';"
      },
      {
        from: "import { toast } from '@/hooks/useToast';",
        to: "import { toast } from '@/hooks';"
      }
    ]
  },
  {
    path: 'src/app/calendar/page.tsx',
    replacements: [
      {
        from: "import { Layout } from '@/components/layout/Layout';",
        to: "import { Layout } from '@/components/layout';"
      },
      {
        from: "import { Card } from '@/components/ui/Card';",
        to: "import { Card } from '@/components/ui';"
      },
      {
        from: "import { Button } from '@/components/ui/Button';",
        to: "import { Button } from '@/components/ui';"
      },
      {
        from: "import { CardContent } from '@/components/ui/Card';",
        to: "import { CardContent } from '@/components/ui';"
      }
    ]
  }
];

let totalFixed = 0;

filesToFix.forEach(file => {
  const filePath = path.join(__dirname, file.path);
  
  console.log(`\n📄 Procesando: ${file.path}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ Archivo no encontrado`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  file.replacements.forEach(replacement => {
    if (content.includes(replacement.from)) {
      content = content.replace(replacement.from, replacement.to);
      console.log(`   ✅ Actualizado: ${replacement.from.substring(0, 50)}...`);
      modified = true;
    } else {
      // Buscar variaciones del import
      const importRegex = new RegExp(`from\\s+['"]${replacement.from.match(/from\s+['"](.+)['"]/)?.[1]}['"]`);
      if (importRegex.test(content)) {
        console.log(`   ⚠️  Import ya modificado o con formato diferente`);
      }
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`   💾 Archivo guardado con ${file.replacements.filter(r => content.includes(r.to)).length} cambios`);
    totalFixed++;
  } else {
    console.log(`   ℹ️  No se requirieron cambios`);
  }
});

// Buscar otros archivos que puedan tener el mismo problema
console.log('\n🔍 Buscando otros archivos con imports similares...\n');

function findFilesWithProblematicImports(dir) {
  const problematicImports = [
    /@\/components\/ui\/\w+['"]/,
    /@\/components\/layout\/\w+['"]/,
    /@\/hooks\/\w+['"]/
  ];
  
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
          
          problematicImports.forEach(regex => {
            if (regex.test(content)) {
              const relativePath = path.relative(__dirname, fullPath);
              if (!files.includes(relativePath)) {
                files.push(relativePath);
              }
            }
          });
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
const filesWithImports = findFilesWithProblematicImports(srcDir);

if (filesWithImports.length > 0) {
  console.log(`Encontrados ${filesWithImports.length} archivos con imports que podrían necesitar actualización:`);
  
  // Mostrar solo los primeros 10
  filesWithImports.slice(0, 10).forEach(file => {
    console.log(`   - ${file}`);
  });
  
  if (filesWithImports.length > 10) {
    console.log(`   ... y ${filesWithImports.length - 10} más`);
  }
}

console.log('\n' + '='.repeat(70));
console.log('\n✅ PROCESO COMPLETADO\n');

if (totalFixed > 0) {
  console.log(`Se actualizaron ${totalFixed} archivos.`);
  console.log('\nAhora ejecuta estos comandos:');
  console.log('\n1. Agregar cambios:');
  console.log('   git add .');
  console.log('\n2. Commit:');
  console.log('   git commit -m "Fix: Use index exports to avoid case sensitivity issues"');
  console.log('\n3. Push:');
  console.log('   git push');
} else {
  console.log('Los archivos ya estaban actualizados o los cambios ya se habían aplicado.');
  console.log('\nSi Vercel sigue fallando, intenta:');
  console.log('1. Limpiar el caché de Vercel desde el dashboard');
  console.log('2. Desconectar y reconectar el repositorio en Vercel');
}

console.log('\n💡 IMPORTANTE:');
console.log('Esta solución usa archivos index.ts para centralizar exports,');
console.log('evitando problemas de case sensitivity entre Windows y Linux.');
