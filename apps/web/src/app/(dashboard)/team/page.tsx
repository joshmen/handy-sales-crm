'use client';

import React, { Suspense, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Loader2 } from 'lucide-react';

import { MiembrosTab } from './components/MiembrosTab';
import { DispositivosTab } from './components/DispositivosTab';

type TeamTab = 'miembros' | 'dispositivos';

function TeamPageContent() {
  const [activeTab, setActiveTab] = useState<TeamTab>('miembros');

  return (
    <PageHeader
      breadcrumbs={[
        { label: 'Inicio', href: '/dashboard' },
        { label: 'Equipo' },
      ]}
      title="Equipo"
      subtitle="Gestiona los miembros y dispositivos de tu equipo"
    >
      {/* Tabs */}
      <div role="tablist" aria-label="Equipo" className="flex items-center gap-1 mb-6 border-b border-border">
        <button
          role="tab"
          aria-selected={activeTab === 'miembros'}
          onClick={() => setActiveTab('miembros')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'miembros'
              ? 'border-green-600 text-green-600 dark:text-green-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Miembros
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'dispositivos'}
          onClick={() => setActiveTab('dispositivos')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'dispositivos'
              ? 'border-green-600 text-green-600 dark:text-green-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Dispositivos
        </button>
      </div>

      {activeTab === 'miembros' && <MiembrosTab />}
      {activeTab === 'dispositivos' && <DispositivosTab />}
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
