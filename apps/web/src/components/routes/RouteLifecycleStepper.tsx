'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Clock, PackageCheck, Play, Flag, Lock, Check } from 'lucide-react';
import { ESTADO_RUTA } from '@/services/api/routes';
import { cn } from '@/lib/utils';

/**
 * Indicador de ciclo de vida de una ruta. Muestra los 5 estados
 * (Pendiente → Carga aceptada → En progreso → Completada → Cerrada)
 * con el actual resaltado.
 *
 * Bug #4-web (audit 2026-05-07): el stepper inline previo en
 * `routes/manage/[id]/close/page.tsx` estaba apretado en el header
 * con `mt-4 -mb-6` (negative margin hack), texto chico (`text-[11px]`),
 * separadores delgados, sin íconos. Confirmado por screenshot del
 * owner mostrando padding insuficiente y números 1-5 sin contexto
 * visual claro.
 *
 * Este componente reemplaza el inline:
 * - Pasos `w-9 h-9` (vs `w-5 h-5`).
 * - Iconos lucide específicos por etapa (Clock para pendiente,
 *   PackageCheck para carga aceptada, Play para en progreso,
 *   Flag para completada, Lock para cerrada).
 * - Etiquetas `text-xs` en mobile, `text-sm` en md+ con tabular-nums.
 * - Padding propio (no negative margins).
 * - Separadores `h-0.5` con color que refleja progreso.
 */

type RouteEstado = number;

interface StepConfig {
  estado: RouteEstado;
  labelKey: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const STEP_CONFIG: StepConfig[] = [
  { estado: ESTADO_RUTA.PendienteAceptar, labelKey: 'lifecyclePending', Icon: Clock },
  { estado: ESTADO_RUTA.CargaAceptada, labelKey: 'lifecycleLoadAccepted', Icon: PackageCheck },
  { estado: ESTADO_RUTA.EnProgreso, labelKey: 'lifecycleInProgress', Icon: Play },
  { estado: ESTADO_RUTA.Completada, labelKey: 'lifecycleCompleted', Icon: Flag },
  { estado: ESTADO_RUTA.Cerrada, labelKey: 'lifecycleClosed', Icon: Lock },
];

export interface RouteLifecycleStepperProps {
  /** Estado actual de la ruta */
  estado: RouteEstado;
  /** Si la ruta fue Cancelada — muestra los pasos en gris con badge de cancelación */
  cancelada?: boolean;
  /** Padding vertical extra alrededor del stepper */
  className?: string;
}

export function RouteLifecycleStepper({
  estado,
  cancelada = false,
  className,
}: RouteLifecycleStepperProps) {
  const tl = useTranslations('routes.detail');

  // Caso especial: ruta cancelada — todos los pasos en gris.
  if (cancelada) {
    return (
      <div className={cn('flex items-center justify-center py-3 px-4', className)}>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-sm font-medium border border-red-200">
          <Lock className="w-4 h-4" />
          {tl('lifecycleCancelled') || 'Cancelada'}
        </span>
      </div>
    );
  }

  const currentIdx = STEP_CONFIG.findIndex(s => s.estado === estado);

  return (
    <div
      className={cn(
        'flex items-center w-full overflow-x-auto px-2 py-4',
        className
      )}
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={STEP_CONFIG.length}
      aria-valuenow={currentIdx + 1}
      aria-label={tl('lifecycleProgress') || 'Progreso de la ruta'}
    >
      {STEP_CONFIG.map((step, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isPending = idx > currentIdx;
        const Icon = step.Icon;

        return (
          <React.Fragment key={step.estado}>
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0 min-w-[80px]">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center transition-colors border-2',
                  isCompleted && 'bg-success text-success-foreground border-success',
                  isCurrent && 'bg-success/10 text-success border-success ring-4 ring-success/20',
                  isPending && 'bg-surface-2 text-muted-foreground border-border-subtle'
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={cn(
                  'text-[11px] md:text-xs font-medium text-center max-w-[100px] leading-tight',
                  isCurrent && 'text-success font-semibold',
                  isCompleted && 'text-foreground/70',
                  isPending && 'text-muted-foreground'
                )}
              >
                {tl(step.labelKey)}
              </span>
            </div>

            {idx < STEP_CONFIG.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-1 md:mx-2 mb-6 transition-colors',
                  isCompleted ? 'bg-success' : 'bg-border-subtle'
                )}
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
