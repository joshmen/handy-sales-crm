'use client';

import React from 'react';
import { Card, Metric, Text, Flex, BadgeDelta } from '@tremor/react';
import { TrendingUp, TrendingDown } from 'lucide-react';

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

const decorationColorMap: Record<string, string> = {
  green: 'emerald',
  blue: 'blue',
  amber: 'amber',
  red: 'red',
  gray: 'gray',
};

export function ReportKPICards({ cards }: ReportKPICardsProps) {
  return (
    <div className={`grid gap-4 ${cards.length <= 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`} data-tour="report-kpis">
      {cards.map((card, i) => (
        <Card
          key={i}
          decoration="top"
          decorationColor={decorationColorMap[card.color || 'gray'] as 'emerald' | 'blue' | 'amber' | 'red' | 'gray'}
          className="page-animate"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <Flex justifyContent="between" alignItems="center">
            <Text>{card.label}</Text>
            {card.icon}
          </Flex>
          <Metric className="mt-2">{card.value}</Metric>
          {(card.subValue || card.trend !== undefined) && (
            <Flex justifyContent="start" className="mt-2 gap-2">
              {card.trend !== undefined && (
                <BadgeDelta
                  deltaType={card.trend >= 0 ? 'increase' : 'decrease'}
                  size="xs"
                >
                  {Math.abs(card.trend)}%
                </BadgeDelta>
              )}
              {card.subValue && <Text className="text-xs">{card.subValue}</Text>}
            </Flex>
          )}
        </Card>
      ))}
    </div>
  );
}
