'use client';

import { Gift } from 'lucide-react';
import { ComingSoonModule } from '@/components/admin/ComingSoonModule';

export default function ChangelogPage() {
  return (
    <ComingSoonModule
      icon={Gift}
      title="Novedades"
      subtitle="Novedades y registro de cambios de la plataforma."
    />
  );
}
