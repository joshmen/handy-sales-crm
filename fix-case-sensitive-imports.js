const fs = require('fs');
const path = require('path');

// Script para arreglar problemas de case sensitivity en imports
// Ejecutar con: node fix-case-sensitive-imports.js

const fixImports = () => {
  const srcDir = path.join(__dirname, 'src');
  const filesToFix = [];
  
  // Mapeo de imports incorrectos a correctos
  const importFixes = {
    // Arreglar imports de componentes UI
    "@/components/ui/Card": "@/components/ui/Card",
    "@/components/ui/Button": "@/components/ui/Button",
    "@/components/layout/Layout": "@/components/layout/Layout",
    
    // Arreglar import de useToast - este es el más problemático
    "@/hooks/useToast": "@/hooks/useToast"
  };

  // Función para encontrar todos los archivos .tsx y .ts
  function findFiles(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.includes('node_modules')) {
        findFiles(filePath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        filesToFix.push(filePath);
      }
    });
  }

  // Encontrar todos los archivos
  findFiles(srcDir);
  
  console.log(`Encontrados ${filesToFix.length} archivos para revisar...`);
  
  let fixedCount = 0;
  
  // Procesar cada archivo
  filesToFix.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Verificar y arreglar imports problemáticos específicos
    
    // 1. Arreglar import de toast desde hooks (el más problemático)
    if (content.includes("import { toast } from '@/hooks/useToast'")) {
      // Cambiar a usar el hook correcto
      content = content.replace(
        "import { toast } from '@/hooks/useToast'",
        "import { toast } from '@/hooks/useToast'"
      );
      modified = true;
      console.log(`✓ Fixed toast import in: ${path.relative(__dirname, filePath)}`);
    }
    
    // 2. Verificar que todos los imports de componentes UI usen la capitalización correcta
    const uiImportRegex = /from ['"]@\/components\/ui\/(\w+)['"]/g;
    const matches = content.matchAll(uiImportRegex);
    
    for (const match of matches) {
      const componentName = match[1];
      // Lista de componentes UI con su capitalización correcta
      const correctNames = {
        'card': 'Card',
        'button': 'Button',
        'input': 'Input',
        'label': 'Label',
        'select': 'Select',
        'dialog': 'Dialog',
        'modal': 'Modal',
        'table': 'Table',
        'tabs': 'Tabs',
        'toast': 'Toast',
        'toaster': 'Toaster',
        'avatar': 'Avatar',
        'badge': 'Badge',
        'separator': 'Separator',
        'loading': 'Loading'
      };
      
      const lowerName = componentName.toLowerCase();
      if (correctNames[lowerName] && componentName !== correctNames[lowerName]) {
        const oldImport = `from '@/components/ui/${componentName}'`;
        const newImport = `from '@/components/ui/${correctNames[lowerName]}'`;
        content = content.replace(oldImport, newImport);
        modified = true;
        console.log(`✓ Fixed UI component import: ${componentName} → ${correctNames[lowerName]} in ${path.relative(__dirname, filePath)}`);
      }
    }
    
    // 3. Verificar imports de layout
    const layoutImportRegex = /from ['"]@\/components\/layout\/(\w+)['"]/g;
    const layoutMatches = content.matchAll(layoutImportRegex);
    
    for (const match of layoutMatches) {
      const componentName = match[1];
      const correctLayoutNames = {
        'layout': 'Layout',
        'mainlayout': 'MainLayout',
        'header': 'Header',
        'sidebar': 'Sidebar',
        'mobilemenu': 'MobileMenu'
      };
      
      const lowerName = componentName.toLowerCase();
      if (correctLayoutNames[lowerName] && componentName !== correctLayoutNames[lowerName]) {
        const oldImport = `from '@/components/layout/${componentName}'`;
        const newImport = `from '@/components/layout/${correctLayoutNames[lowerName]}'`;
        content = content.replace(oldImport, newImport);
        modified = true;
        console.log(`✓ Fixed layout import: ${componentName} → ${correctLayoutNames[lowerName]} in ${path.relative(__dirname, filePath)}`);
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      fixedCount++;
    }
  });
  
  console.log(`\n✅ Proceso completado. Se arreglaron ${fixedCount} archivos.`);
  
  // Mensaje importante sobre el problema de toast
  console.log('\n⚠️  IMPORTANTE: El problema principal es con el import de toast.');
  console.log('Hay múltiples archivos de toast en el proyecto:');
  console.log('  - src/hooks/useToast.tsx (exporta toast y useToast)');
  console.log('  - src/hooks/toast.ts');
  console.log('  - src/hooks/toast.tsx');
  console.log('  - src/components/ui/use-toast.ts');
  console.log('\nAsegúrate de usar consistentemente el mismo archivo en todo el proyecto.\n');
};

// Ejecutar el fix
fixImports();
