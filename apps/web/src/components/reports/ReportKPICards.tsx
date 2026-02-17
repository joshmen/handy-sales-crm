'use client';

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface KPICard {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: number; // percentage, positive = up, negative = down
  icon?: React.ReactNode;
  color?: 'green' | 'blue' | 'amber' | 'red' | 'gray';
}

interface ReportKPICardsProps {
  cards: KPICard[];
}

const colorMap = {
  green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  gray: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

export function ReportKPICards({ cards }: ReportKPICardsProps) {
  return (
    <div className={`grid gap-4 ${cards.length <= 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`} data-tour="report-kpis">
      {cards.map((card, i) => {
        const c = colorMap[card.color || 'gray'];
        return (
          <div key={i} className={`p-4 rounded-lg border ${c.border} ${c.bg}`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-500">{card.label}</p>
              {card.icon}
            </div>
            <p className={`text-2xl font-bold ${c.text}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {card.value}
            </p>
            {(card.subValue || card.trend !== undefined) && (
              <div className="flex items-center gap-1.5 mt-1">
                {card.trend !== undefined && (
                  <span className={`flex items-center text-xs font-medium ${card.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {card.trend >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                    {Math.abs(card.trend)}%
                  </span>
                )}
                {card.subValue && <span className="text-xs text-gray-500">{card.subValue}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
