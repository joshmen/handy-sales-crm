'use client';

import React, { Suspense } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Loader2 } from 'lucide-react';

import { MiembrosTab } from './components/MiembrosTab';

function TeamPageContent() {
  return (
    <PageHeader
      breadcrumbs={[
        { label: 'Inicio', href: '/dashboard' },
        { label: 'Equipo' },
      ]}
      title="Equipo"
      subtitle="Gestiona los miembros de tu equipo"
    >
      <MiembrosTab />
    </PageHeader>
  );
}

export default function TeamPage() {
  return (
    <Suspense fallback={<div role="status" className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-green-600" aria-hidden="true" /><span className="sr-only">Cargando...</span></div>}>
      <TeamPageContent />
    </Suspense>
  );
}
