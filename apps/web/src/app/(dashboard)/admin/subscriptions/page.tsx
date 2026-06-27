'use client';

import { RefreshCw } from 'lucide-react';
import { ComingSoonModule } from '@/components/admin/ComingSoonModule';

export default function SubscriptionsPage() {
  return (
    <ComingSoonModule
      icon={RefreshCw}
      title="Suscripciones"
      subtitle="Suscripciones activas e ingresos recurrentes."
    />
  );
}
