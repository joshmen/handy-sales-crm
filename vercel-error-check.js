const fs = require('fs');
const path = require('path');

console.log('🔍 Verificación específica de errores reportados por Vercel\n');
console.log('=' .repeat(70));

// Los errores exactos reportados por Vercel
const vercelErrors = [
  {
    file: './src/app/billing/suspended/page.tsx',
    imports: [
      "@/components/ui/Card",
      "@/components/ui/Button", 
      "@/hooks/useToast"
    ]
  },
  {
    file: './src/app/calendar/page.tsx',
    imports: [
      "@/components/layout/Layout",
      "@/components/ui/Card"
    ]
  }
];

// Función para resolver un import path a archivo real
function resolveImportPath(importPath) {
  const basePath = importPath.replace('@/', 'src/');
  const possiblePaths = [];
  
  // Si ya tiene extensión, usar tal cual
  if (path.extname(basePath)) {
    possiblePaths.push(basePath);
  } else {
    // Intentar diferentes extensiones y paths
    possiblePaths.push(
      basePath + '.tsx',
      basePath + '.ts',
      basePath + '.jsx',
      basePath + '.js',
      basePath + '/index.tsx',
      basePath + '/index.ts',
      basePath + '/index.jsx',
      basePath + '/index.js'
    );
  }
  
  return possiblePaths;
}

// Verificar cada error reportado
vercelErrors.forEach(error => {
  console.log(`\n📄 Archivo: ${error.file}`);
  
  const filePath = path.join(__dirname, error.file.replace('./', ''));
  
  // Verificar si el archivo existe
  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ El archivo NO EXISTE`);
    return;
  }
  
  console.log(`   ✅ El archivo existe`);
  
  // Leer el contenido del archivo
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Verificar cada import problemático
  console.log(`\n   Verificando imports problemáticos:`);
  
  error.imports.forEach(importPath => {
    console.log(`\n   Import: ${importPath}`);
    
    // Buscar el import en el archivo
    const importRegex = new RegExp(`from\\s+['"]${importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`);
    const hasImport = importRegex.test(content);
    
    if (!hasImport) {
      console.log(`     ⚠️  Este import no está en el archivo`);
      // Buscar variaciones
      const variations = [
        importPath,
        importPath.toLowerCase(),
        importPath.replace(/([A-Z])/g, (match, p1, offset) => offset > 0 ? match.toLowerCase() : match)
      ];
      
      variations.forEach(variant => {
        if (content.includes(`from '${variant}'`) || content.includes(`from "${variant}"`)) {
          console.log(`     ⚠️  Encontrado como: ${variant}`);
        }
      });
    } else {
      console.log(`     ✅ Import encontrado en el archivo`);
    }
    
    // Verificar si el archivo importado existe
    const possiblePaths = resolveImportPath(importPath);
    let found = false;
    
    for (const possiblePath of possiblePaths) {
      const fullPath = path.join(__dirname, possiblePath);
      if (fs.existsSync(fullPath)) {
        console.log(`     ✅ Archivo destino existe: ${possiblePath}`);
        found = true;
        
        // Verificar el case exacto
        const dir = path.dirname(fullPath);
        const basename = path.basename(fullPath);
        const files = fs.readdirSync(dir);
        const exactMatch = files.find(f => f === basename);
        
        if (exactMatch !== basename) {
          console.log(`     ⚠️  PROBLEMA DE CASE: archivo real es "${exactMatch}"`);
        }
        
        break;
      }
    }
    
    if (!found) {
      console.log(`     ❌ Archivo destino NO EXISTE`);
      
      // Buscar archivos similares
      const searchDir = path.dirname(path.join(__dirname, possiblePaths[0]));
      if (fs.existsSync(searchDir)) {
        const files = fs.readdirSync(searchDir);
        const baseName = path.basename(possiblePaths[0], path.extname(possiblePaths[0]));
        const similar = files.filter(f => 
          f.toLowerCase().includes(baseName.toLowerCase()) ||
          baseName.toLowerCase().includes(f.toLowerCase().replace(path.extname(f), ''))
        );
        
        if (similar.length > 0) {
          console.log(`     📁 Archivos similares en ${searchDir.replace(__dirname, '.')}:`);
          similar.forEach(f => console.log(`        - ${f}`));
        }
      }
    }
  });
});

// Verificar el contenido real de las carpetas
console.log('\n' + '='.repeat(70));
console.log('\n📁 CONTENIDO REAL DE LAS CARPETAS:\n');

const dirsToCheck = [
  'src/components/ui',
  'src/components/layout',
  'src/hooks'
];

dirsToCheck.forEach(dir => {
  const fullDir = path.join(__dirname, dir);
  if (fs.existsSync(fullDir)) {
    console.log(`\n${dir}/`);
    const files = fs.readdirSync(fullDir).filter(f => 
      f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.jsx') || f.endsWith('.js')
    );
    files.forEach(f => {
      // Mostrar el nombre exacto del archivo
      console.log(`   ${f}`);
    });
  }
});

// Verificar si hay algún archivo .gitignore que pueda estar causando problemas
console.log('\n' + '='.repeat(70));
console.log('\n📝 VERIFICANDO .gitignore:\n');

const gitignorePath = path.join(__dirname, '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const gitignore = fs.readFileSync(gitignorePath, 'utf8');
  const lines = gitignore.split('\n').filter(line => 
    line.trim() && !line.startsWith('#') && 
    (line.includes('src/') || line.includes('*.tsx') || line.includes('*.ts'))
  );
  
  if (lines.length > 0) {
    console.log('⚠️  Líneas en .gitignore que podrían afectar:');
    lines.forEach(line => console.log(`   ${line}`));
  } else {
    console.log('✅ .gitignore no parece tener reglas problemáticas');
  }
}

// Solución final
console.log('\n' + '='.repeat(70));
console.log('\n🎯 SOLUCIÓN DEFINITIVA:\n');

console.log('Ejecuta estos comandos EN ESTE ORDEN EXACTO:\n');
console.log('1. Primero, configura Git para ser case-sensitive:');
console.log('   git config core.ignorecase false\n');

console.log('2. Verifica que no haya cambios pendientes:');
console.log('   git status\n');

console.log('3. Si hay cambios, haz commit primero:');
console.log('   git add .');
console.log('   git commit -m "Save current changes"\n');

console.log('4. Ahora fuerza a Git a re-trackear todos los archivos:');
console.log('   git rm -r --cached .');
console.log('   git add .');
console.log('   git commit -m "Fix case sensitivity for Vercel"\n');

console.log('5. Push con force (necesario para sobrescribir):');
console.log('   git push --force-with-lease\n');

console.log('6. Si TODAVÍA falla en Vercel:');
console.log('   a) Ve al dashboard de Vercel');
console.log('   b) Settings -> Git -> Disconnect');
console.log('   c) Vuelve a conectar el repositorio');
console.log('   d) Esto forzará un rebuild completo sin caché\n');

console.log('💡 ALTERNATIVA si lo anterior no funciona:');
console.log('   Crea una nueva branch y haz el deployment desde ahí:');
console.log('   git checkout -b fix-vercel-build');
console.log('   git push -u origin fix-vercel-build');
console.log('   Luego en Vercel, cambia la branch de deployment a "fix-vercel-build"');
