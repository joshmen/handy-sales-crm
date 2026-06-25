'use client';

import React from 'react';

// Pill suave de estado — espejo del StatusBadge del mockup Claude Design:
// fondo tono-50, texto del tono, + dot. Tonos: success(verde real), warning(ámbar),
// danger(rojo), info/primary(azul), default(neutro).
// IMPORTANTE: el token `success` del app quedó AZUL tras el rebrand → para verde real
// se usan clases explícitas `green-*` (no `bg-success`).
export type SoftBadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'default';

const TONE_STYLES: Record<SoftBadgeTone, { wrap: string; dot: string }> = {
  success: { wrap: 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300', dot: 'bg-green-500' },
  warning: { wrap: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', dot: 'bg-amber-500' },
  danger: { wrap: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300', dot: 'bg-red-500' },
  info: { wrap: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300', dot: 'bg-blue-500' },
  primary: { wrap: 'bg-primary/10 text-primary', dot: 'bg-primary' },
  default: { wrap: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' },
};

export function SoftBadge({ children, tone = 'default', dot = true }: { children: React.ReactNode; tone?: SoftBadgeTone; dot?: boolean }) {
  const s = TONE_STYLES[tone] ?? TONE_STYLES.default;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold whitespace-nowrap ${s.wrap}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />}
      {children}
    </span>
  );
}
