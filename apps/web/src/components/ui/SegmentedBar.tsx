'use client';

import React from 'react';

export interface BarSegment {
  /** valor crudo (se normaliza al total) */
  value: number;
  /** color del segmento (hex/css) */
  color: string;
  /** etiqueta para la leyenda */
  label: string;
}

/**
 * Barra apilada multicolor (flex divs, sin librería de gráficas). Usada en el
 * resumen de Metas (en camino / por debajo / en riesgo) y en el panel de
 * historial de Automatizaciones (éxito / omitido / falló).
 */
export function SegmentedBar({
  segments,
  height = 10,
  showLegend = true,
  className = '',
}: {
  segments: BarSegment[];
  height?: number;
  showLegend?: boolean;
  className?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);

  return (
    <div className={className}>
      <div
        className="flex w-full overflow-hidden rounded-full bg-muted"
        style={{ height }}
        role="img"
        aria-label={segments.map(s => `${s.label}: ${s.value}`).join(', ')}
      >
        {total > 0 &&
          segments.map((s, i) =>
            s.value > 0 ? (
              <div
                key={i}
                style={{ width: `${(s.value / total) * 100}%`, background: s.color, transition: 'width 0.5s ease' }}
                title={`${s.label}: ${s.value}`}
              />
            ) : null
          )}
      </div>
      {showLegend && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {segments.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-[9px] w-[9px] rounded-[3px]" style={{ background: s.color }} />
              <span className="font-medium text-foreground">{s.value}</span>
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
