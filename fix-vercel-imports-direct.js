const fs = require('fs');
const path = require('path');

console.log('🔧 REVERTIENDO A IMPORTS DIRECTOS PARA VERCEL\n');
console.log('=' .repeat(60));
console.log('\nEsta es la solución más confiable para Vercel\n');

// Lista de archivos a corregir con sus reemplazos específicos
const filesToFix = [
  {
    file: 'src/app/billing/suspended/page.tsx',
    replacements: [
      {
        old: "import { Card } from '@/components/ui';",
        new: "import { Card } from '@/components/ui/Card';"
      },
      {
        old: "import { Button } from '@/components/ui';",
        new: "import { Button } from '@/components/ui/Button';"
      },
      {
        old: "import { toast } from '@/hooks';",
        new: "import { toast } from '@/hooks/useToast';"
      }
    ]
  },
  {
    file: 'src/app/calendar/page.tsx',
    replacements: [
      {
        old: "import { Layout } from '@/components/layout';",
        new: "import { Layout } from '@/components/layout/Layout';"
      },
      {
        old: "import { Card } from '@/components/ui';",
        new: "import { Card } from '@/components/ui/Card';"
      },
      {
        old: "import { Button } from '@/components/ui';",
        new: "import { Button } from '@/components/ui/Button';"
      },
      {
        old: "import { CardContent } from '@/components/ui';",
        new: "import { CardContent } from '@/components/ui/Card';"
      }
    ]
  }
];

let totalFixed = 0;

filesToFix.forEach(({ file, replacements }) => {
  const fullPath = path.join(__dirname, file);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ No encontrado: ${file}`);
    return;
  }
  
  console.log(`\n📄 Procesando: ${file}`);
  let content = fs.readFileSync(fullPath, 'utf8');
  let changes = 0;
  
  replacements.forEach(({ old, new: newStr }) => {
    if (content.includes(old)) {
      content = content.replace(old, newStr);
      console.log(`   ✅ Corregido: ${old.substring(0, 40)}...`);
      changes++;
    }
  });
  
  if (changes > 0) {
    fs.writeFileSync(fullPath, content);
    console.log(`   💾 Guardado con ${changes} cambios`);
    totalFixed++;
  } else {
    console.log(`   ℹ️  No se necesitaron cambios`);
  }
});

console.log('\n' + '=' .repeat(60));
console.log(`\n✅ PROCESO COMPLETADO - ${totalFixed} archivos actualizados\n`);

if (totalFixed > 0) {
  console.log('SIGUIENTE PASO - Ejecuta estos comandos:\n');
  console.log('  git add .');
  console.log('  git commit -m "Fix: Use direct imports for Vercel compatibility"');
  console.log('  git push');
  console.log('\nEsto debería resolver el problema en Vercel.');
} else {
  console.log('Los archivos ya tienen imports directos.');
  console.log('\nSi Vercel sigue fallando, la única opción es:');
  console.log('1. Ve a vercel.com');
  console.log('2. Settings → Git → Disconnect');
  console.log('3. Reconecta el repositorio');
}
