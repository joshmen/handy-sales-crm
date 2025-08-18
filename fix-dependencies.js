const fs = require('fs');
const path = require('path');

console.log('🔧 SOLUCIONANDO PROBLEMA DE DEPENDENCIES VS DEVDEPENDENCIES\n');
console.log('=' .repeat(70));

console.log('\n📊 PROBLEMA IDENTIFICADO:');
console.log('En producción, Vercel solo instala "dependencies", no "devDependencies"');
console.log('Esto puede causar errores de "Module not found"\n');

// Leer package.json
const packagePath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Dependencias que DEBEN estar en dependencies para el build
const requiredInDependencies = [
  'tailwindcss-animate',  // Usado en tailwind.config.js
  // typescript ya no es necesario moverlo en Next.js 13+
];

// Verificar si hay dependencias mal ubicadas
console.log('📦 VERIFICANDO DEPENDENCIAS:\n');

let changesMade = false;

requiredInDependencies.forEach(dep => {
  if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
    console.log(`⚠️  ${dep} está en devDependencies pero debería estar en dependencies`);
    
    // Mover la dependencia
    const version = packageJson.devDependencies[dep];
    packageJson.dependencies[dep] = version;
    delete packageJson.devDependencies[dep];
    
    console.log(`   ✅ Movido a dependencies con versión ${version}`);
    changesMade = true;
  } else if (packageJson.dependencies[dep]) {
    console.log(`✅ ${dep} ya está en dependencies`);
  } else {
    console.log(`❌ ${dep} no está instalado`);
  }
});

// Guardar cambios si los hay
if (changesMade) {
  // Ordenar dependencies alfabéticamente
  packageJson.dependencies = Object.keys(packageJson.dependencies)
    .sort()
    .reduce((obj, key) => {
      obj[key] = packageJson.dependencies[key];
      return obj;
    }, {});
  
  // Guardar package.json
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log('\n✅ package.json actualizado');
  
  console.log('\n📝 SIGUIENTE PASO:');
  console.log('1. Ejecuta: npm install');
  console.log('2. Ejecuta: git add package.json package-lock.json');
  console.log('3. Ejecuta: git commit -m "Fix: Move build dependencies to dependencies"');
  console.log('4. Ejecuta: git push');
} else {
  console.log('\n✅ Todas las dependencias están correctamente ubicadas');
}

// Verificar si vercel.json tiene la configuración correcta
console.log('\n📋 VERIFICANDO CONFIGURACIÓN DE VERCEL:\n');

const vercelConfigPath = path.join(__dirname, 'vercel.json');
if (fs.existsSync(vercelConfigPath)) {
  const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
  
  if (vercelConfig.installCommand && vercelConfig.installCommand.includes('--legacy-peer-deps')) {
    console.log('✅ vercel.json usa --legacy-peer-deps');
  } else {
    console.log('⚠️  Actualizando vercel.json para usar --legacy-peer-deps');
    vercelConfig.installCommand = 'npm install --legacy-peer-deps';
    fs.writeFileSync(vercelConfigPath, JSON.stringify(vercelConfig, null, 2) + '\n');
  }
} else {
  console.log('⚠️  No existe vercel.json, creando uno...');
  const vercelConfig = {
    framework: 'nextjs',
    installCommand: 'npm install --legacy-peer-deps',
    buildCommand: 'npm run build',
    outputDirectory: '.next'
  };
  fs.writeFileSync(vercelConfigPath, JSON.stringify(vercelConfig, null, 2) + '\n');
  console.log('✅ vercel.json creado');
}

console.log('\n' + '=' .repeat(70));
console.log('\n💡 SOLUCIONES ADICIONALES:\n');

console.log('OPCIÓN 1: Forzar instalación completa en Vercel');
console.log('En vercel.json, cambia installCommand a:');
console.log('  "installCommand": "npm install --legacy-peer-deps --production=false"');
console.log('');

console.log('OPCIÓN 2: Usar NODE_ENV=development temporalmente');
console.log('En Vercel Dashboard → Settings → Environment Variables:');
console.log('  NODE_ENV = development');
console.log('');

console.log('OPCIÓN 3: Mover TODAS las dependencias de build');
console.log('Si sigues teniendo problemas, ejecuta:');
console.log('  npm install --save-dev typescript @types/node @types/react');

console.log('\n📚 REFERENCIA:');
console.log('https://vercel.com/guides/dependencies-from-package-json-missing-after-install');
