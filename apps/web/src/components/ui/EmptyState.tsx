import React from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  /** Título principal (sin datos). */
  title: string;
  /** Descripción opcional debajo del título. */
  description?: string;
  /** Ícono Lucide para el tile (default: Inbox). */
  icon?: LucideIcon;
  /** CTA opcional (ej. un botón para crear el primer registro). */
  action?: React.ReactNode;
  /** Padding reducido para usar dentro de tarjetas/tablas. */
  compact?: boolean;
}

/**
 * Placeholder consistente para estados sin datos. Fiel al EmptyState del
 * Claude Design (tile 60px + título + descripción + CTA opcional).
 */
export function EmptyState({ title, description, icon: Icon = Inbox, action, compact = false }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 ${compact ? 'py-14' : 'py-[76px]'}`}>
      <div className="w-[60px] h-[60px] rounded-[18px] bg-surface-3 text-muted-foreground flex items-center justify-center mb-[18px]">
        <Icon size={28} />
      </div>
      <div className="text-[17px] font-bold tracking-tight text-foreground mb-1.5">{title}</div>
      {description && (
        <div className="text-[13.5px] text-muted-foreground max-w-[320px] leading-relaxed">{description}</div>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
