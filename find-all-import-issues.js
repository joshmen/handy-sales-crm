const fs = require('fs');
const path = require('path');

console.log('🔍 Buscando todos los archivos con errores de importación...\n');
console.log('=' .repeat(70));

// Función para buscar imports problemáticos
function findProblematicImports(dir) {
  const issues = [];
  
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
          const lines = content.split('\n');
          const relativePath = path.relative(__dirname, fullPath);
          
          lines.forEach((line, index) => {
            // Buscar imports de componentes UI con path directo
            if (line.includes("from '@/components/ui/") && !line.includes("from '@/components/ui'")) {
              const match = line.match(/from\s+['"]@\/components\/ui\/(\w+)['"]/);
              if (match) {
                issues.push({
                  file: relativePath,
                  line: index + 1,
                  import: match[0],
                  component: match[1],
                  type: 'ui'
                });
              }
            }
            
            // Buscar imports de layout con path directo
            if (line.includes("from '@/components/layout/") && !line.includes("from '@/components/layout'")) {
              const match = line.match(/from\s+['"]@\/components\/layout\/(\w+)['"]/);
              if (match) {
                issues.push({
                  file: relativePath,
                  line: index + 1,
                  import: match[0],
                  component: match[1],
                  type: 'layout'
                });
              }
            }
            
            // Buscar imports de hooks con path directo
            if (line.includes("from '@/hooks/") && !line.includes("from '@/hooks'")) {
              const match = line.match(/from\s+['"]@\/hooks\/(\w+)['"]/);
              if (match) {
                issues.push({
                  file: relativePath,
                  line: index + 1,
                  import: match[0],
                  component: match[1],
                  type: 'hooks'
                });
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
  return issues;
}

// Buscar todos los problemas
const srcDir = path.join(__dirname, 'src');
const issues = findProblematicImports(srcDir);

// Agrupar por archivo
const issuesByFile = {};
issues.forEach(issue => {
  if (!issuesByFile[issue.file]) {
    issuesByFile[issue.file] = [];
  }
  issuesByFile[issue.file].push(issue);
});

console.log(`\n📊 RESUMEN: Encontrados ${issues.length} imports que necesitan actualización en ${Object.keys(issuesByFile).length} archivos\n`);

// Mostrar los problemas agrupados
Object.entries(issuesByFile).forEach(([file, fileIssues]) => {
  console.log(`\n📄 ${file}:`);
  fileIssues.forEach(issue => {
    console.log(`   Línea ${issue.line}: ${issue.import}`);
  });
});

// Generar script de corrección
console.log('\n' + '='.repeat(70));
console.log('\n🔧 GENERANDO CORRECCIONES AUTOMÁTICAS...\n');

const corrections = [];

Object.entries(issuesByFile).forEach(([file, fileIssues]) => {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  const replacements = [];
  
  fileIssues.forEach(issue => {
    let oldImport = '';
    let newImport = '';
    
    if (issue.type === 'ui') {
      oldImport = `from '@/components/ui/${issue.component}'`;
      newImport = `from '@/components/ui'`;
    } else if (issue.type === 'layout') {
      oldImport = `from '@/components/layout/${issue.component}'`;
      newImport = `from '@/components/layout'`;
    } else if (issue.type === 'hooks') {
      oldImport = `from '@/hooks/${issue.component}'`;
      newImport = `from '@/hooks'`;
    }
    
    if (!replacements.find(r => r.oldImport === oldImport)) {
      replacements.push({ oldImport, newImport });
    }
  });
  
  corrections.push({ file, replacements });
});

// Crear archivo de corrección
const fixScript = `
const fs = require('fs');
const path = require('path');

console.log('🔧 Aplicando correcciones automáticas...\\n');

const corrections = ${JSON.stringify(corrections, null, 2)};

let totalFixed = 0;
let filesFixed = 0;

corrections.forEach(correction => {
  const filePath = path.join(__dirname, correction.file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  correction.replacements.forEach(replacement => {
    if (content.includes(replacement.oldImport)) {
      content = content.replace(new RegExp(replacement.oldImport.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'g'), replacement.newImport);
      modified = true;
      totalFixed++;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesFixed++;
    console.log(\`✅ \${correction.file}\`);
  }
});

console.log(\`\\n✅ Corregidos \${totalFixed} imports en \${filesFixed} archivos\\n\`);
console.log('Ahora ejecuta:');
console.log('  git add .');
console.log('  git commit -m "Fix: Update all imports to use index exports"');
console.log('  git push');
`;

fs.writeFileSync(path.join(__dirname, 'apply-fixes.js'), fixScript);

console.log('✅ Script de corrección creado: apply-fixes.js');
console.log('\nEjecuta:');
console.log('  node apply-fixes.js');
console.log('\nEsto corregirá automáticamente todos los imports problemáticos.');

// Verificar también si hay problemas con los archivos index
console.log('\n' + '='.repeat(70));
console.log('\n🔍 VERIFICANDO ARCHIVOS INDEX...\n');

const indexFiles = [
  'src/components/ui/index.ts',
  'src/components/layout/index.ts',
  'src/hooks/index.ts'
];

indexFiles.forEach(indexFile => {
  const fullPath = path.join(__dirname, indexFile);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${indexFile} existe`);
    
    // Verificar que los archivos que exporta también existen
    const content = fs.readFileSync(fullPath, 'utf8');
    const exportMatches = content.matchAll(/from\s+['"]\.\/([\w-]+)['"]/g);
    
    for (const match of exportMatches) {
      const exportedFile = match[1];
      const dir = path.dirname(fullPath);
      
      // Verificar con diferentes extensiones
      const extensions = ['.tsx', '.ts', '.jsx', '.js'];
      let found = false;
      
      for (const ext of extensions) {
        if (fs.existsSync(path.join(dir, exportedFile + ext))) {
          found = true;
          break;
        }
      }
      
      if (!found && fs.existsSync(path.join(dir, exportedFile, 'index.ts'))) {
        found = true;
      }
      
      if (!found) {
        console.log(`   ⚠️  Export de '${exportedFile}' pero el archivo no existe`);
      }
    }
  } else {
    console.log(`❌ ${indexFile} NO existe`);
  }
});
