'use client';

import React from 'react';
import { StatCard, type StatTone } from '@/components/dashboard/StatCard';

export interface KPICard {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: number;
  icon?: React.ReactNode;
  color?: 'green' | 'blue' | 'amber' | 'red' | 'gray';
}

interface ReportKPICardsProps {
  cards: KPICard[];
}

/** Paleta "azul de marca": green/blue → azul (primary), amber → ámbar, red → rojo, gray → gris. */
const COLOR_TONE: Record<NonNullable<KPICard['color']>, StatTone> = {
  green: 'primary',
  blue: 'primary',
  amber: 'warning',
  red: 'danger',
  gray: 'default',
};

/**
 * ReportKPICards — homologado al StatCard canónico (Claude Design). Conserva su API
 * (`KPICard[]`) y el grid responsivo, pero renderiza con tile de ícono + valor 28px/800.
 */
export function ReportKPICards({ cards }: ReportKPICardsProps) {
  return (
    <div
      className={`grid gap-4 ${cards.length <= 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}
      data-tour="report-kpis"
    >
      {cards.map((card, i) => {
        const hasTrend = card.trend !== undefined;
        return (
          <StatCard
            key={i}
            label={card.label}
            value={card.value}
            tone={COLOR_TONE[card.color || 'gray']}
            iconNode={card.icon}
            delta={hasTrend ? `${Math.abs(card.trend as number)}%` : undefined}
            deltaTone={hasTrend ? ((card.trend as number) >= 0 ? 'success' : 'danger') : 'neutral'}
            deltaLabel={hasTrend ? card.subValue : undefined}
            sub={!hasTrend ? card.subValue : undefined}
            className="page-animate"
          />
        );
      })}
    </div>
  );
}
