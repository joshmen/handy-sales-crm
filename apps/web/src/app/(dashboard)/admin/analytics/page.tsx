'use client';

import { BarChart3 } from 'lucide-react';
import { ComingSoonModule } from '@/components/admin/ComingSoonModule';

export default function AnalyticsPage() {
  return (
    <ComingSoonModule
      icon={BarChart3}
      title="Analitica"
      subtitle="Metricas de negocio de la plataforma."
    />
  );
}
