#!/usr/bin/env node

/**
 * 🔍 Script de Verificación de Deployment
 * Ejecuta: node verify-deployment.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.cyan}${'='.repeat(50)}\n${msg}\n${'='.repeat(50)}${colors.reset}`)
};

// Verificación de archivos necesarios
function checkRequiredFiles() {
  log.header('📁 Verificando archivos necesarios');
  
  const requiredFiles = [
    'package.json',
    'next.config.js',
    'vercel.json',
    '.gitignore',
    'tsconfig.json',
    'tailwind.config.js'
  ];
  
  let allFilesExist = true;
  
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      log.success(`${file} existe`);
    } else {
      log.error(`${file} no encontrado`);
      allFilesExist = false;
    }
  });
  
  return allFilesExist;
}

// Verificación de configuración de Vercel
function checkVercelConfig() {
  log.header('⚡ Verificando configuración de Vercel');
  
  try {
    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    
    if (vercelConfig.framework === 'nextjs') {
      log.success('Framework configurado correctamente (Next.js)');
    } else {
      log.warning('Framework no está configurado como Next.js');
    }
    
    if (vercelConfig.env) {
      log.success(`Variables de entorno configuradas: ${Object.keys(vercelConfig.env).join(', ')}`);
    } else {
      log.warning('No hay variables de entorno configuradas en vercel.json');
    }
    
    if (vercelConfig.regions) {
      log.success(`Regiones configuradas: ${vercelConfig.regions.join(', ')}`);
    }
    
    return true;
  } catch (error) {
    log.error(`Error leyendo vercel.json: ${error.message}`);
    return false;
  }
}

// Verificación de GitHub Actions
function checkGitHubActions() {
  log.header('🔧 Verificando GitHub Actions');
  
  const workflowsPath = '.github/workflows';
  
  if (!fs.existsSync(workflowsPath)) {
    log.error('Directorio de workflows no encontrado');
    return false;
  }
  
  const workflows = fs.readdirSync(workflowsPath);
  
  if (workflows.length === 0) {
    log.error('No hay workflows configurados');
    return false;
  }
  
  workflows.forEach(workflow => {
    log.success(`Workflow encontrado: ${workflow}`);
  });
  
  return true;
}

// Verificación de variables de entorno locales
function checkEnvFiles() {
  log.header('🔑 Verificando archivos de entorno');
  
  const envFiles = ['.env.local', '.env.production'];
  let hasEnvFiles = false;
  
  envFiles.forEach(file => {
    if (fs.existsSync(file)) {
      log.success(`${file} existe`);
      hasEnvFiles = true;
      
      // Leer y verificar variables importantes
      const envContent = fs.readFileSync(file, 'utf8');
      const importantVars = [
        'NEXTAUTH_SECRET',
        'NEXTAUTH_URL',
        'NEXT_PUBLIC_API_URL'
      ];
      
      importantVars.forEach(varName => {
        if (envContent.includes(varName)) {
          log.info(`  → ${varName} configurado`);
        } else {
          log.warning(`  → ${varName} no encontrado`);
        }
      });
    } else {
      log.warning(`${file} no encontrado`);
    }
  });
  
  if (!hasEnvFiles) {
    log.warning('Considera crear un archivo .env.local para desarrollo local');
  }
  
  return true;
}

// Verificación de dependencias
function checkDependencies() {
  log.header('📦 Verificando dependencias');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const criticalDeps = [
      'next',
      'react',
      'react-dom',
      'next-auth'
    ];
    
    let allDepsPresent = true;
    
    criticalDeps.forEach(dep => {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        log.success(`${dep}: ${packageJson.dependencies[dep]}`);
      } else {
        log.error(`${dep} no encontrado en dependencies`);
        allDepsPresent = false;
      }
    });
    
    // Verificar scripts
    log.info('\n📜 Scripts disponibles:');
    if (packageJson.scripts) {
      const importantScripts = ['dev', 'build', 'start', 'lint', 'test'];
      importantScripts.forEach(script => {
        if (packageJson.scripts[script]) {
          log.success(`npm run ${script}`);
        } else {
          log.warning(`Script '${script}' no configurado`);
        }
      });
    }
    
    return allDepsPresent;
  } catch (error) {
    log.error(`Error leyendo package.json: ${error.message}`);
    return false;
  }
}

// Verificación de Git
function checkGitStatus() {
  log.header('📝 Estado de Git');
  
  try {
    // Verificar si es un repositorio git
    if (!fs.existsSync('.git')) {
      log.error('No es un repositorio Git');
      return false;
    }
    
    // Obtener rama actual
    const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    log.info(`Rama actual: ${branch}`);
    
    // Verificar estado
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status) {
      log.warning('Hay cambios sin commitear:');
      console.log(status);
    } else {
      log.success('Todos los cambios están commiteados');
    }
    
    // Verificar remoto
    try {
      const remote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
      log.success(`Remoto configurado: ${remote}`);
    } catch {
      log.error('No hay remoto configurado');
    }
    
    return true;
  } catch (error) {
    log.error(`Error verificando Git: ${error.message}`);
    return false;
  }
}

// Test de build local
function testLocalBuild() {
  log.header('🏗️ Probando build local');
  
  log.info('Ejecutando build de prueba...');
  log.warning('Esto puede tomar unos minutos...');
  
  try {
    execSync('npm run build', { 
      stdio: 'inherit',
      env: {
        ...process.env,
        NEXTAUTH_SECRET: 'test-secret-for-build',
        NEXTAUTH_URL: 'http://localhost:3000'
      }
    });
    log.success('Build completado exitosamente');
    return true;
  } catch (error) {
    log.error('Error durante el build');
    log.error('Revisa los errores arriba y corrígelos antes de hacer deploy');
    return false;
  }
}

// Función principal
async function main() {
  console.log(colors.cyan);
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║     🚀 HandyCRM - Verificación de Deployment    ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(colors.reset);
  
  const checks = [
    { name: 'Archivos requeridos', fn: checkRequiredFiles },
    { name: 'Configuración Vercel', fn: checkVercelConfig },
    { name: 'GitHub Actions', fn: checkGitHubActions },
    { name: 'Variables de entorno', fn: checkEnvFiles },
    { name: 'Dependencias', fn: checkDependencies },
    { name: 'Estado Git', fn: checkGitStatus }
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    const result = check.fn();
    if (!result) {
      allPassed = false;
    }
  }
  
  // Preguntar si quiere hacer test de build
  log.header('🤔 ¿Quieres ejecutar un build de prueba?');
  log.info('Esto verificará que tu código compile correctamente.');
  log.warning('Presiona Ctrl+C para saltar o Enter para continuar...');
  
  // En un entorno no interactivo, saltar el build de prueba
  if (process.env.CI) {
    log.info('Saltando build de prueba en CI');
  } else {
    // Esperar input del usuario
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    await new Promise(resolve => {
      readline.question('', () => {
        readline.close();
        testLocalBuild();
        resolve();
      });
    });
  }
  
  // Resumen final
  log.header('📊 RESUMEN');
  
  if (allPassed) {
    log.success('¡Todo listo para el deployment! 🎉');
    log.info('\nPróximos pasos:');
    log.info('1. Configura los secrets en GitHub');
    log.info('2. Haz commit de tus cambios');
    log.info('3. Push a main o develop para activar el pipeline');
  } else {
    log.error('Hay problemas que resolver antes del deployment');
    log.info('\nRevisa los errores arriba y corrígelos');
  }
}

// Ejecutar
main().catch(error => {
  log.error(`Error inesperado: ${error.message}`);
  process.exit(1);
});
