/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { ActivityChartData } from '@/services/dashboardService';

interface ActivityChartProps {
  data: ActivityChartData[];
  title?: string;
  subtitle?: string;
  height?: number;
  isLoading?: boolean;
  className?: string;
}

export const ActivityChart: React.FC<ActivityChartProps> = ({
  data,
  title = 'Actividad del Sistema',
  subtitle = 'Tendencia de actividad de los últimos 7 días',
  height = 300,
  isLoading = false,
  className = '',
}) => {
  // Colores para cada métrica
  const colors = {
    totalActivities: '#3b82f6', // Azul
    logins: '#10b981', // Verde
    uniqueUsers: '#8b5cf6', // Púrpura
    errors: '#ef4444', // Rojo
  };

  // Componente personalizado para el tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between space-x-4">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  ></div>
                  <span className="text-sm">
                    {entry.dataKey === 'totalActivities' && 'Actividades:'}
                    {entry.dataKey === 'logins' && 'Logins:'}
                    {entry.dataKey === 'uniqueUsers' && 'Usuarios:'}
                    {entry.dataKey === 'errors' && 'Errores:'}
                  </span>
                </div>
                <span className="text-sm font-semibold">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Calcular métricas totales
  const totals = data.reduce(
    (acc, item) => ({
      totalActivities: acc.totalActivities + item.totalActivities,
      logins: acc.logins + item.logins,
      uniqueUsers: acc.uniqueUsers + item.uniqueUsers,
      errors: acc.errors + item.errors,
    }),
    { totalActivities: 0, logins: 0, uniqueUsers: 0, errors: 0 }
  );

  // Componente personalizado para la leyenda
  const CustomLegend = ({ payload }: any) => {
    const labels: Record<string, string> = {
      totalActivities: 'Actividades',
      logins: 'Logins',
      uniqueUsers: 'Usuarios',
      errors: 'Errores',
    };

    return (
      <div className="flex justify-center space-x-6 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            ></div>
            <span className="text-sm text-gray-600">{labels[entry.value] || entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">{subtitle}</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-400">
            <p>No hay datos de actividad disponibles</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">{subtitle}</p>
          </div>

          {/* Métricas rápidas */}
          <div className="flex space-x-6 text-right">
            <div>
              <p className="text-xs text-gray-500">Actividades</p>
              <p className="text-sm font-semibold text-blue-600">{totals.totalActivities}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Logins</p>
              <p className="text-sm font-semibold text-green-600">{totals.logins}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Errores</p>
              <p className="text-sm font-semibold text-red-600">{totals.errors}</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.totalActivities} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={colors.totalActivities} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="loginsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.logins} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={colors.logins} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />

              <Area
                type="monotone"
                dataKey="totalActivities"
                stroke={colors.totalActivities}
                strokeWidth={2}
                fill="url(#activityGradient)"
              />
              <Area
                type="monotone"
                dataKey="logins"
                stroke={colors.logins}
                strokeWidth={2}
                fill="url(#loginsGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
