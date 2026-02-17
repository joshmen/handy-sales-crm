import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import {
  MapPin,
  CheckCircle,
  ShoppingCart,
  Clock,
  XCircle,
  TrendingUp,
} from 'lucide-react';

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
  const stats = [
    {
      label: 'Total Visitas',
      value: totalVisits,
      icon: MapPin,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Completadas',
      value: completedVisits,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: 'Con Venta',
      value: visitsWithSale,
      icon: ShoppingCart,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      label: 'Pendientes',
      value: pendingVisits,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      label: 'Canceladas',
      value: cancelledVisits,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      label: 'Tasa Conversión',
      value: `${conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
  ];

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 ${className}`}>
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon size={20} className={stat.color} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
