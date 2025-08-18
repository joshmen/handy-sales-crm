const fs = require('fs');
const path = require('path');

console.log('🔍 Verificación exhaustiva de archivos para Vercel\n');
console.log('=' .repeat(60));

// Función para verificar si un archivo existe con el case exacto
function checkFileCase(filepath) {
  const dir = path.dirname(filepath);
  const basename = path.basename(filepath);
  
  try {
    const files = fs.readdirSync(dir);
    const found = files.find(f => f === basename);
    const foundInsensitive = files.find(f => f.toLowerCase() === basename.toLowerCase());
    
    return {
      exists: !!found,
      exactMatch: found === basename,
      actualName: found || foundInsensitive || null,
      expectedName: basename
    };
  } catch (e) {
    return {
      exists: false,
      exactMatch: false,
      actualName: null,
      expectedName: basename,
      error: e.message
    };
  }
}

// Lista de archivos críticos a verificar
const criticalFiles = [
  'src/components/ui/Card.tsx',
  'src/components/ui/Button.tsx',
  'src/components/ui/Toast.tsx',
  'src/components/ui/Toaster.tsx',
  'src/components/ui/use-toast.ts',
  'src/components/layout/Layout.tsx',
  'src/hooks/useToast.tsx',
  'src/hooks/toast.tsx',
  'src/hooks/toast.ts',
  'src/lib/utils.ts'
];

console.log('\n📁 VERIFICACIÓN DE ARCHIVOS CRÍTICOS:\n');

const issues = [];

criticalFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  const result = checkFileCase(fullPath);
  
  if (!result.exists) {
    console.log(`❌ ${file}`);
    console.log(`   No existe en el sistema de archivos`);
    if (result.actualName) {
      console.log(`   ⚠️  Encontrado como: ${result.actualName}`);
    }
    issues.push({file, issue: 'not found', actual: result.actualName});
  } else if (!result.exactMatch) {
    console.log(`⚠️  ${file}`);
    console.log(`   Case incorrecto: ${result.actualName}`);
    issues.push({file, issue: 'case mismatch', actual: result.actualName});
  } else {
    console.log(`✅ ${file}`);
  }
});

// Verificar archivos problemáticos específicos
console.log('\n📝 ANÁLISIS DE ARCHIVOS PROBLEMÁTICOS:\n');

const problemFiles = [
  'src/app/billing/suspended/page.tsx',
  'src/app/calendar/page.tsx'
];

problemFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ ${file} - No encontrado`);
    return;
  }
  
  console.log(`\n📄 ${file}:`);
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  const importLines = lines.filter(line => line.includes('import') && line.includes('from'));
  
  // Analizar cada import
  importLines.forEach(line => {
    const match = line.match(/from\s+['"](.+?)['"]/);
    if (match && match[1].startsWith('@/')) {
      const importPath = match[1];
      
      // Convertir el import path a un path de archivo real
      const resolvedPath = importPath
        .replace('@/', 'src/')
        .replace(/^src\/hooks\/(\w+)$/, (m, name) => {
          // Verificar múltiples extensiones para hooks
          const extensions = ['.tsx', '.ts', '.jsx', '.js'];
          for (const ext of extensions) {
            const testPath = `src/hooks/${name}${ext}`;
            if (fs.existsSync(path.join(__dirname, testPath))) {
              return testPath;
            }
          }
          return `src/hooks/${name}.tsx`; // default
        })
        .replace(/^src\/components\//, (m) => {
          return 'src/components/';
        });
      
      // Si no tiene extensión, intentar encontrar el archivo
      let finalPath = resolvedPath;
      if (!path.extname(resolvedPath)) {
        const extensions = ['.tsx', '.ts', '/index.tsx', '/index.ts', '.jsx', '.js'];
        for (const ext of extensions) {
          const testPath = resolvedPath + ext;
          if (fs.existsSync(path.join(__dirname, testPath))) {
            finalPath = testPath;
            break;
          }
        }
      }
      
      const result = checkFileCase(path.join(__dirname, finalPath));
      
      if (!result.exists) {
        console.log(`   ❌ Import: ${importPath}`);
        console.log(`      Archivo no encontrado: ${finalPath}`);
        if (result.actualName) {
          console.log(`      Posible archivo: ${result.actualName}`);
        }
      } else if (!result.exactMatch) {
        console.log(`   ⚠️  Import: ${importPath}`);
        console.log(`      Case incorrecto: esperado ${result.expectedName}, encontrado ${result.actualName}`);
      } else {
        console.log(`   ✅ Import: ${importPath}`);
      }
    }
  });
});

// Verificar si hay archivos duplicados con diferentes cases
console.log('\n🔍 BUSCANDO ARCHIVOS DUPLICADOS:\n');

function findDuplicates(dir, baseDir = dir) {
  const files = {};
  
  function scan(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      items.forEach(item => {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.includes('node_modules') && !item.startsWith('.')) {
          scan(fullPath);
        } else if (stat.isFile() && (item.endsWith('.tsx') || item.endsWith('.ts'))) {
          const relativePath = path.relative(baseDir, fullPath);
          const lowerPath = relativePath.toLowerCase();
          
          if (!files[lowerPath]) {
            files[lowerPath] = [];
          }
          files[lowerPath].push(relativePath);
        }
      });
    } catch (e) {
      // Ignorar errores de permisos
    }
  }
  
  scan(dir);
  
  const duplicates = Object.entries(files).filter(([key, values]) => values.length > 1);
  return duplicates;
}

const srcDir = path.join(__dirname, 'src');
const duplicates = findDuplicates(srcDir, __dirname);

if (duplicates.length > 0) {
  console.log('⚠️  Archivos con posibles problemas de case:');
  duplicates.forEach(([key, files]) => {
    console.log(`\n   ${key}:`);
    files.forEach(f => console.log(`     - ${f}`));
  });
} else {
  console.log('✅ No se encontraron archivos duplicados con diferentes cases');
}

// Resumen y recomendaciones
console.log('\n' + '='.repeat(60));
console.log('\n📊 RESUMEN:\n');

if (issues.length === 0) {
  console.log('✅ Todos los archivos críticos están correctos');
} else {
  console.log(`❌ Se encontraron ${issues.length} problemas:`);
  issues.forEach(issue => {
    console.log(`   - ${issue.file}: ${issue.issue}`);
    if (issue.actual) {
      console.log(`     Actual: ${issue.actual}`);
    }
  });
}

console.log('\n💡 SOLUCIÓN RECOMENDADA:\n');

if (issues.length > 0) {
  console.log('1. Hay discrepancias en los nombres de archivo.');
  console.log('2. Ejecuta estos comandos para forzar a Git a reconocer los cambios:\n');
  console.log('   git config core.ignorecase false');
  console.log('   git rm -r --cached .');
  console.log('   git add .');
  console.log('   git commit -m "Fix case sensitivity for Linux/Vercel"');
  console.log('   git push --force-with-lease\n');
  console.log('3. Si el problema persiste, considera renombrar los archivos problemáticos:');
  issues.forEach(issue => {
    if (issue.actual) {
      const dir = path.dirname(issue.file);
      const expected = path.basename(issue.file);
      console.log(`   mv "${path.join(dir, issue.actual)}" "${path.join(dir, expected)}"`);
    }
  });
} else {
  console.log('Los archivos parecen estar correctos.');
  console.log('El problema puede estar en:');
  console.log('1. Caché de Vercel - intenta un redeploy con caché limpio');
  console.log('2. Caché de Git - ejecuta:');
  console.log('   git config core.ignorecase false');
  console.log('   git rm -r --cached .');
  console.log('   git add .');
  console.log('   git commit -m "Force case-sensitive file tracking"');
  console.log('   git push --force-with-lease');
}

console.log('\n🔧 CONFIGURACIÓN ADICIONAL:\n');
console.log('Asegúrate de que tu repositorio Git esté configurado correctamente:');
console.log('   git config core.ignorecase false');
console.log('\nEsto hará que Git sea sensible a mayúsculas/minúsculas como Linux/Vercel.');
