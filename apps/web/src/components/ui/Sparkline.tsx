'use client';

import React from 'react';

/**
 * Mini-gráfica de tendencia (SVG inline, sin librería). Ligera para usar en
 * filas/cards (cards de Automatizaciones, hero). REGLA: alimentar solo con dato
 * REAL (no inventar series). Si `data` está vacío o es plano, no se dibuja.
 */
export function Sparkline({
  data,
  width = 72,
  height = 24,
  color = '#15924a',
  fill = true,
  strokeWidth = 1.6,
  className = '',
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  strokeWidth?: number;
  className?: string;
}) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = strokeWidth;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * innerW;
    const y = pad + innerH - ((v - min) / range) * innerH;
    return [x, y] as const;
  });

  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${(pad + innerW).toFixed(1)} ${(pad + innerH).toFixed(1)} L${pad.toFixed(1)} ${(pad + innerH).toFixed(1)} Z`;
  const gid = `spark-${color.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <svg width={width} height={height} className={className} aria-hidden="true">
      {fill && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gid})`} />
        </>
      )}
      <path d={linePath} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
