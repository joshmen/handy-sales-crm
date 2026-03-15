'use client';

import { useState } from 'react';
import { Plus, FileText, ToggleLeft, ToggleRight, Construction, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';

export default function FormsPage() {
  const [showDisabled, setShowDisabled] = useState(false);

  return (
    <PageHeader
      breadcrumbs={[
        { label: 'Inicio', href: '/dashboard' },
        { label: 'Formularios' },
      ]}
      title="Formularios"
      subtitle="Crea formularios personalizados para tus vendedores"
      actions={
        <Button disabled className="gap-1.5 bg-green-600 hover:bg-green-700 text-white opacity-50 cursor-not-allowed">
          <Plus className="w-4 h-4" />
          Crear
        </Button>
      }
    >
      {/* Próximamente Banner */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg">
        <Construction className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-amber-800 dark:text-amber-300">Próximamente</p>
          <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
            El módulo de formularios está en desarrollo. Pronto podrás crear formularios personalizados para tus vendedores.
          </p>
        </div>
      </div>

      {/* Controls Row */}
      <div className="flex items-center justify-between mt-6 mb-4">
        <button
          onClick={() => setShowDisabled(!showDisabled)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showDisabled ? (
            <ToggleRight className="w-9 h-5 text-green-600" />
          ) : (
            <ToggleLeft className="w-9 h-5 text-muted-foreground" />
          )}
          <span>Mostrar inactivos</span>
        </button>
      </div>

      {/* Empty State */}
      <div className="bg-card border border-border rounded-xl">
        <div className="flex flex-col items-center justify-center h-64 py-20">
          <FileText className="w-10 h-10 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No hay formularios</h3>
          <p className="text-sm text-muted-foreground text-center">
            Esta funcionalidad estará disponible próximamente
          </p>
        </div>
      </div>
    </PageHeader>
  );
}
