'use client';

import React from 'react';

// Avatar de iniciales con color por hash del nombre (paleta categórica del diseño Claude).
// Espejo del Avatar del mockup: chip cuadrado-redondeado (borderRadius size*0.32), iniciales en blanco.
export const AVATAR_PALETTE = ['#0D8A7A', '#7C3AED', '#DC2626', '#D97706', '#2563EB', '#DB2777', '#65A30D', '#0891B2'];

export function NameAvatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const hash = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const bg = AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
  return (
    <span
      className="inline-flex items-center justify-center flex-shrink-0 font-bold text-white"
      style={{ width: size, height: size, borderRadius: size * 0.32, background: bg, fontSize: size * 0.4, letterSpacing: '-0.02em' }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
