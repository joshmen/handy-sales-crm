#!/usr/bin/env node

/**
 * Script para arreglar problemas de case sensitivity en imports
 * Ejecutar con: node fix-imports.js
 */

const fs = require('fs');
const path = require('path');

// Mapeo de imports problemáticos a sus versiones correctas
const importFixes = {
  // Componentes UI - usar los nombres exactos de los archivos
  "@/components/ui/Card": "@/components/ui/Card",
  "@/components/ui/Button": "@/components/ui/Button",
  "@/components/ui/Loading": "@/components/ui/Loading",
  "@/components/ui/Input": "@/components/ui/Input",
  "@/components/ui/Label": "@/components/ui/Label",
  "@/components/ui/Modal": "@/components/ui/Modal",
  "@/components/ui/Select": "@/components/ui/Select",
  "@/components/ui/Table": "@/components/ui/Table",
  "@/components/ui/Tabs": "@/components/ui/Tabs",
  "@/components/ui/Toast": "@/components/ui/Toast",
  "@/components/ui/Toaster": "@/components/ui/Toaster",
  "@/components/ui/Avatar": "@/components/ui/Avatar",
  "@/components/ui/Badge": "@/components/ui/Badge",
  "@/components/ui/Dialog": "@/components/ui/Dialog",
  "@/components/ui/Separator": "@/components/ui/Separator",
  
  // Hooks - usar los nombres exactos
  "@/hooks/useToast": "@/hooks/useToast",
  "@/hooks/use-toast": "@/hooks/use-toast",
  "@/hooks/useAuth": "@/hooks/useAuth",
  "@/hooks/useApi": "@/hooks/useApi",
  "@/hooks/useForm": "@/hooks/useForm",
  "@/hooks/useUtils": "@/hooks/useUtils",
  "@/hooks/useDebounce": "@/hooks/useDebounce",
  "@/hooks/useLocalStorage": "@/hooks/useLocalStorage",
  "@/hooks/usePermissions": "@/hooks/usePermissions",
  
  // Layout components
  "@/components/layout/Layout": "@/components/layout/Layout",
  "@/components/layout/MainLayout": "@/components/layout/MainLayout",
  "@/components/layout/Sidebar": "@/components/layout/Sidebar",
  "@/components/layout/Header": "@/components/layout/Header",
};

// Función para buscar y arreglar archivos
function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Buscar y reemplazar cada import problemático
    for (const [wrong, correct] of Object.entries(importFixes)) {
      // Regex para encontrar imports con diferentes formatos
      const patterns = [
        new RegExp(`from ['"]${wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g'),
        new RegExp(`import\\(['"]${wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\)`, 'g'),
        new RegExp(`require\\(['"]${wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\)`, 'g'),
      ];
      
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          content = content.replace(pattern, (match) => {
            return match.replace(wrong, correct);
          });
          modified = true;
          console.log(`✅ Fixed import in ${filePath}: ${wrong} -> ${correct}`);
        }
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Función para recorrer directorio
function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Ignorar node_modules y .next
      if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist' && file !== 'build') {
        walkDir(filePath, callback);
      }
    } else if (stat.isFile()) {
      // Solo procesar archivos TypeScript y JavaScript
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
        callback(filePath);
      }
    }
  });
}

// Función principal
function main() {
  console.log('🔍 Buscando y arreglando imports con problemas de case sensitivity...\n');
  
  const srcDir = path.join(__dirname, 'src');
  let filesFixed = 0;
  let totalFiles = 0;
  
  walkDir(srcDir, (filePath) => {
    totalFiles++;
    if (fixImportsInFile(filePath)) {
      filesFixed++;
    }
  });
  
  console.log('\n📊 Resumen:');
  console.log(`   Total archivos procesados: ${totalFiles}`);
  console.log(`   Archivos corregidos: ${filesFixed}`);
  
  if (filesFixed > 0) {
    console.log('\n✨ ¡Imports arreglados! Ahora haz commit de los cambios:');
    console.log('   git add -A');
    console.log('   git commit -m "Fix import case sensitivity issues"');
    console.log('   git push');
  } else {
    console.log('\n✅ No se encontraron problemas de imports.');
  }
}

// Ejecutar
main();
