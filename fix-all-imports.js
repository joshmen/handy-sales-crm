const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECCIÓN MASIVA DE IMPORTS\n');
console.log('=' .repeat(70));

// Función para corregir imports en un archivo
function fixImportsInFile(filePath, dryRun = false) {
  if (!fs.existsSync(filePath)) {
    return { fixed: false, error: 'File not found' };
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Patrones de reemplazo
  const replacements = [
    // UI Components - reemplazar imports directos con imports desde index
    { 
      pattern: /from\s+['"]@\/components\/ui\/(Card|Button|Toast|Toaster|Avatar|Badge|Dialog|Input|Label|Loading|Modal|Select|SelectCompat|Separator|Table|Tabs)['"]/g,
      replacement: "from '@/components/ui'"
    },
    // Layout Components
    { 
      pattern: /from\s+['"]@\/components\/layout\/(Layout|Header|Sidebar|MainLayout|MobileMenu)['"]/g,
      replacement: "from '@/components/layout'"
    },
    // Hooks
    { 
      pattern: /from\s+['"]@\/hooks\/(useToast|toast|useApi|useForm|usePermissions|useUtils)['"]/g,
      replacement: "from '@/hooks'"
    },
    // Fix CardContent and other named exports from Card
    {
      pattern: /import\s+{\s*Card\s*,\s*CardContent\s*,?\s*CardHeader?\s*,?\s*CardFooter?\s*}\s+from\s+['"]@\/components\/ui\/Card['"]/g,
      replacement: "import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui'"
    },
    {
      pattern: /import\s+{\s*CardContent\s*}\s+from\s+['"]@\/components\/ui\/Card['"]/g,
      replacement: "import { CardContent } from '@/components/ui'"
    }
  ];
  
  // Aplicar todos los reemplazos
  replacements.forEach(({ pattern, replacement }) => {
    content = content.replace(pattern, replacement);
  });
  
  // Verificar si hubo cambios
  const hasChanges = content !== originalContent;
  
  if (hasChanges && !dryRun) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  
  return { 
    fixed: hasChanges, 
    changes: hasChanges ? 'File updated' : 'No changes needed'
  };
}

// Función recursiva para encontrar todos los archivos .tsx y .ts
function findAllSourceFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Ignorar node_modules y directorios ocultos
      if (!file.includes('node_modules') && !file.startsWith('.')) {
        findAllSourceFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      // Ignorar archivos de declaración de tipos
      if (!file.endsWith('.d.ts')) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

// Encontrar todos los archivos fuente
const srcDir = path.join(__dirname, 'src');
console.log('🔍 Buscando archivos...\n');
const sourceFiles = findAllSourceFiles(srcDir);

console.log(`Encontrados ${sourceFiles.length} archivos para procesar\n`);

// Procesar cada archivo
let fixedCount = 0;
const fixedFiles = [];

sourceFiles.forEach(file => {
  const relativePath = path.relative(__dirname, file);
  const result = fixImportsInFile(file);
  
  if (result.fixed) {
    fixedCount++;
    fixedFiles.push(relativePath);
    console.log(`✅ ${relativePath}`);
  }
});

// Resumen
console.log('\n' + '=' .repeat(70));
console.log('\n📊 RESUMEN:\n');

if (fixedCount > 0) {
  console.log(`✅ Se actualizaron ${fixedCount} archivos:`);
  
  // Mostrar solo los primeros 20 archivos si hay muchos
  const displayFiles = fixedFiles.slice(0, 20);
  displayFiles.forEach(file => {
    console.log(`   - ${file}`);
  });
  
  if (fixedFiles.length > 20) {
    console.log(`   ... y ${fixedFiles.length - 20} más`);
  }
  
  console.log('\n✅ SIGUIENTE PASO:');
  console.log('\nEjecuta estos comandos:');
  console.log('  git add .');
  console.log('  git commit -m "Fix: Update all imports to use centralized index exports"');
  console.log('  git push');
} else {
  console.log('✅ No se encontraron archivos que necesiten corrección');
  console.log('   Todos los imports ya están usando los archivos index');
}

// Verificar integridad de los archivos index
console.log('\n' + '=' .repeat(70));
console.log('\n🔍 VERIFICANDO INTEGRIDAD DE ARCHIVOS INDEX:\n');

const indexFiles = [
  { 
    path: 'src/components/ui/index.ts',
    requiredExports: ['Card', 'CardContent', 'CardHeader', 'CardFooter', 'Button', 'Input', 'Select', 'Toast']
  },
  { 
    path: 'src/components/layout/index.ts',
    requiredExports: ['Layout', 'Header', 'Sidebar']
  },
  { 
    path: 'src/hooks/index.ts',
    requiredExports: ['useToast', 'toast']
  }
];

indexFiles.forEach(({ path: indexPath, requiredExports }) => {
  const fullPath = path.join(__dirname, indexPath);
  
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    console.log(`✅ ${indexPath}`);
    
    // Verificar exports requeridos
    const missingExports = requiredExports.filter(exp => !content.includes(exp));
    
    if (missingExports.length > 0) {
      console.log(`   ⚠️  Posibles exports faltantes: ${missingExports.join(', ')}`);
    } else {
      console.log(`   ✅ Todos los exports requeridos están presentes`);
    }
  } else {
    console.log(`❌ ${indexPath} - NO EXISTE`);
  }
});

console.log('\n' + '=' .repeat(70));
console.log('\n✅ PROCESO COMPLETADO\n');

if (fixedCount === 0) {
  console.log('💡 Si Vercel sigue fallando después de estos cambios:');
  console.log('   1. Ve al Dashboard de Vercel');
  console.log('   2. Settings → Git → Disconnect');
  console.log('   3. Reconecta el repositorio');
  console.log('   4. Esto forzará un rebuild completo sin caché');
}
