'use client';

import React from 'react';

export interface TabBarItem {
  id: string;
  label: string;
  /** Optional count shown as "label · N". */
  count?: number;
}

interface TabBarProps {
  items: TabBarItem[];
  value: string;
  onChange: (id: string) => void;
  /** Section accent hex for the active underline + text. Defaults to brand blue. */
  accent?: string;
  className?: string;
}

/**
 * SLDS-style underline filter tabs (rediseño visual). Active tab = section accent
 * underline + text. Optional count badge ("Sin clave SAT · 1"). Filters de verdad —
 * controlled via `value`/`onChange`. Replaces hand-rolled segmented filter buttons.
 */
export function TabBar({ items, value, onChange, accent, className = '' }: TabBarProps) {
  // `--primary` es un triplete HSL (ej. "206 99% 42%"), no un color válido por sí solo;
  // hay que envolverlo en hsl() para que `color`/`borderColor` lo apliquen (azul de marca).
  const accentColor = accent || 'hsl(var(--primary))';
  return (
    <div role="tablist" className={`flex items-center gap-1 border-b border-border overflow-x-auto ${className}`}>
      {items.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            style={active ? { color: accentColor, borderColor: accentColor } : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-1.5 py-2.5 mr-4 text-[13px] font-medium transition-colors ${
              active ? '' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.count != null && <span className="ml-1 opacity-60">· {tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
