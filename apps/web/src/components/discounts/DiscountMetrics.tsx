import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { TrendingUp, Play, DollarSign, Percent } from 'lucide-react';
import { Discount, DiscountStatus } from '@/types/discounts';

interface DiscountMetricsProps {
  discounts: Discount[];
  loading?: boolean;
}

export function DiscountMetrics({ discounts, loading = false }: DiscountMetricsProps) {
  const totalDiscounts = discounts.length;
  const activeDiscounts = discounts.filter(d => d.status === DiscountStatus.ACTIVE).length;
  const totalSavings = discounts.reduce((sum, d) => sum + (d.totalSavings || 0), 0);
  const totalUsed = discounts.reduce((sum, d) => sum + (d.totalUsed || 0), 0);

  const metricCards = [
    {
      title: 'Total Descuentos',
      value: totalDiscounts,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Activos',
      value: activeDiscounts,
      icon: Play,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Ahorros Totales',
      value: `$${totalSavings.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Usos Totales',
      value: totalUsed,
      icon: Percent,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {metricCards.map((metric, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{metric.title}</p>
                <p className="text-2xl font-bold">{metric.value}</p>
              </div>
              <div className={`w-8 h-8 ${metric.bgColor} rounded-lg flex items-center justify-center`}>
                <metric.icon className={`w-4 h-4 ${metric.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
