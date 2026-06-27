'use client';

import React from 'react';
import { Wrench } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';

interface ComingSoonModuleProps {
  /** Icono del modulo (lucide), mismo que en el sidebar. */
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle?: string;
}

/**
 * Shell transitorio para los modulos nuevos de la Consola de plataforma (Super Admin).
 * Mantiene la cabecera SLDS (acento superadmin) y muestra un estado honesto
 * "en construccion" mientras se implementa el modulo real. Se reemplaza por el
 * contenido del modulo (StatCards + tabla/Drawer) conforme cada uno se construye.
 */
export function ComingSoonModule({ icon, title, subtitle }: ComingSoonModuleProps) {
  return (
    <PageHeader section="superadmin" icon={icon} title={title} subtitle={subtitle}>
      <EmptyState
        icon={Wrench}
        title="Modulo en construccion"
        description="Esta seccion de la consola de plataforma estara disponible muy pronto."
        size="lg"
      />
    </PageHeader>
  );
}
