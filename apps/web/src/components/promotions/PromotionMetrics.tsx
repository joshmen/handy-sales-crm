// src/components/promotions/PromotionMetrics.tsx
'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Promotion, PromotionStatus } from '@/types/promotions';
import { useFormatters } from '@/hooks/useFormatters';

interface PromotionMetricsProps {
  promotions: Promotion[];
}

export const PromotionMetrics: React.FC<PromotionMetricsProps> = ({ promotions }) => {
  const { formatCurrency } = useFormatters();
  const activePromotions = promotions.filter(p => p.status === PromotionStatus.ACTIVE);
  const pausedPromotions = promotions.filter(p => p.status === PromotionStatus.PAUSED);
  const finishedPromotions = promotions.filter(p => p.status === PromotionStatus.FINISHED);
  
  const totalSavings = promotions.reduce((sum, promotion) => sum + (promotion.totalSavings || 0), 0);
  const totalBudgetUsed = promotions.reduce((sum, promotion) => sum + (promotion.currentBudgetUsed || 0), 0);
  const averageUsage = promotions.length > 0 ? 
    promotions.reduce((sum, promotion) => sum + (promotion.totalUsed || 0), 0) / promotions.length : 0;

  const metrics = [
    {
      title: 'Promociones Activas',
      value: activePromotions.length.toString(),
      subtitle: `${promotions.length} total`,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      icon: '🎁'
    },
    {
      title: 'Promociones Pausadas',
      value: pausedPromotions.length.toString(),
      subtitle: 'Temporalmente inactivas',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      icon: '⏸️'
    },
    {
      title: 'Promociones Finalizadas',
      value: finishedPromotions.length.toString(),
      subtitle: 'Completadas',
      color: 'text-foreground/70',
      bgColor: 'bg-surface-1',
      icon: '✅'
    },
    {
      title: 'Ahorro Total Generado',
      value: formatCurrency(totalSavings),
      subtitle: 'En todas las promociones',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      icon: '💰'
    },
    {
      title: 'Presupuesto Utilizado',
      value: formatCurrency(totalBudgetUsed),
      subtitle: 'Inversión total',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      icon: '📊'
    },
    {
      title: 'Uso Promedio',
      value: averageUsage.toFixed(1),
      subtitle: 'Veces por promoción',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      icon: '📈'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {metrics.map((metric, index) => (
        <Card key={index} className={`${metric.bgColor} border-0`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground/70 mb-1">{metric.title}</p>
                <p className={`text-2xl font-bold ${metric.color} mb-1`}>{metric.value}</p>
                <p className="text-xs text-muted-foreground">{metric.subtitle}</p>
              </div>
              <div className="text-2xl">{metric.icon}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};