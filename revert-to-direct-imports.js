const fs = require('fs');
const path = require('path');

console.log('🔄 Revirtiendo a imports directos temporalmente...\n');

// Archivo 1: billing/suspended/page.tsx
const file1 = path.join(__dirname, 'src/app/billing/suspended/page.tsx');
if (fs.existsSync(file1)) {
  let content = fs.readFileSync(file1, 'utf8');
  
  // Reemplazar imports de ui
  content = content.replace(
    "import { Card } from '@/components/ui';",
    "import { Card } from '@/components/ui/Card';"
  );
  content = content.replace(
    "import { Button } from '@/components/ui';",
    "import { Button } from '@/components/ui/Button';"
  );
  
  // Reemplazar import de hooks
  content = content.replace(
    "import { toast } from '@/hooks';",
    "import { toast } from '@/hooks/useToast';"
  );
  
  fs.writeFileSync(file1, content);
  console.log('✅ Revertido: src/app/billing/suspended/page.tsx');
}

// Archivo 2: calendar/page.tsx
const file2 = path.join(__dirname, 'src/app/calendar/page.tsx');
if (fs.existsSync(file2)) {
  let content = fs.readFileSync(file2, 'utf8');
  
  // Reemplazar imports
  content = content.replace(
    "import { Layout } from '@/components/layout';",
    "import { Layout } from '@/components/layout/Layout';"
  );
  content = content.replace(
    "import { Card } from '@/components/ui';",
    "import { Card } from '@/components/ui/Card';"
  );
  content = content.replace(
    "import { Button } from '@/components/ui';",
    "import { Button } from '@/components/ui/Button';"
  );
  content = content.replace(
    "import { CardContent } from '@/components/ui';",
    "import { CardContent } from '@/components/ui/Card';"
  );
  
  fs.writeFileSync(file2, content);
  console.log('✅ Revertido: src/app/calendar/page.tsx');
}

console.log('\n✅ Listo. Ahora ejecuta:');
console.log('   git add .');
console.log('   git commit -m "Revert to direct imports for Vercel compatibility"');
console.log('   git push');
