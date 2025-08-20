import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Package, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { InventoryMetrics as IInventoryMetrics } from '@/types/inventory';

interface InventoryMetricsProps {
  metrics: IInventoryMetrics;
  loading?: boolean;
}

export function InventoryMetrics({ metrics, loading = false }: InventoryMetricsProps) {
  const metricCards = [
    {
      title: 'Total de Productos',
      value: metrics.totalProducts,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Stock Bajo',
      value: metrics.lowStockProducts,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Sin Stock',
      value: metrics.outOfStockProducts,
      icon: TrendingUp,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      title: 'Valor Total',
      value: `$${metrics.totalValue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metricCards.map((metric, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </p>
                <p className="text-2xl font-bold">
                  {metric.value}
                </p>
              </div>
              <div className={`p-2 rounded-full ${metric.bgColor}`}>
                <metric.icon className={`h-6 w-6 ${metric.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
