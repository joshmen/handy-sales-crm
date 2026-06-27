'use client';

import { LifeBuoy } from 'lucide-react';
import { ComingSoonModule } from '@/components/admin/ComingSoonModule';

export default function SupportPage() {
  return (
    <ComingSoonModule
      icon={LifeBuoy}
      title="Soporte"
      subtitle="Tickets de soporte de las empresas."
    />
  );
}
