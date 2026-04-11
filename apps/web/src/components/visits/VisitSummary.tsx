'use client';

import React from 'react';
import {
  MapPin,
  CheckCircle,
  ShoppingCart,
  Clock,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface VisitSummaryProps {
  totalVisits: number;
  completedVisits: number;
  visitsWithSale: number;
  pendingVisits: number;
  cancelledVisits: number;
  conversionRate: number;
  className?: string;
}

export const VisitSummary: React.FC<VisitSummaryProps> = ({
  totalVisits,
  completedVisits,
  visitsWithSale,
  pendingVisits,
  cancelledVisits,
  conversionRate,
  className = '',
}) => {
  const t = useTranslations('visits');

  const stats = [
    {
      label: t('summary.totalVisits'),
      value: totalVisits,
      icon: MapPin,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: t('summary.completed'),
      value: completedVisits,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: t('summary.withSale'),
      value: visitsWithSale,
      icon: ShoppingCart,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: t('summary.pending'),
      value: pendingVisits,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: t('summary.cancelled'),
      value: cancelledVisits,
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
    },
    {
      label: t('summary.conversionRate'),
      value: `${conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
  ];

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 ${className}`}>
      {stats.map((stat, index) => (
        <div key={index} className="bg-white border border-border-subtle rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            <div className={`p-1.5 rounded-lg ${stat.bgColor} shrink-0`}>
              <stat.icon size={14} className={stat.color} />
            </div>
          </div>
          <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
        </div>
      ))}
    </div>
  );
};
