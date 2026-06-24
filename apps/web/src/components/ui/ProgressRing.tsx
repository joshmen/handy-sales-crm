'use client';

import React from 'react';

/**
 * Anillo de progreso (SVG, ligero — no ApexCharts). Usado en el resumen de
 * Metas (avance del equipo) y el hero de Automatizaciones (activas/total).
 * El contenido central se pasa por `children`.
 */
export function ProgressRing({
  value,
  size = 92,
  stroke = 9,
  color = '#15924a',
  trackColor = 'hsl(var(--muted))',
  children,
  className = '',
}: {
  /** 0-100 */
  value: number;
  size?: number;
  stroke?: number;
  /** color del arco de avance */
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
        {children}
      </div>
    </div>
  );
}
