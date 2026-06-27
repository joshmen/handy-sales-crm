'use client';

import { Flag } from 'lucide-react';
import { ComingSoonModule } from '@/components/admin/ComingSoonModule';

export default function ModulesPage() {
  return (
    <ComingSoonModule
      icon={Flag}
      title="Modulos"
      subtitle="Disponibilidad de modulos por plan."
    />
  );
}
