'use client';

import { Gauge } from 'lucide-react';
import { ComingSoonModule } from '@/components/admin/ComingSoonModule';

export default function StatusPage() {
  return (
    <ComingSoonModule
      icon={Gauge}
      title="Estado del sistema"
      subtitle="Estado y salud de los servicios."
    />
  );
}
