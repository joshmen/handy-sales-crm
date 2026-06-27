'use client';

import { Banknote } from 'lucide-react';
import { ComingSoonModule } from '@/components/admin/ComingSoonModule';

export default function DunningPage() {
  return (
    <ComingSoonModule
      icon={Banknote}
      title="Cobros"
      subtitle="Cobros fallidos y recuperacion de pagos."
    />
  );
}
