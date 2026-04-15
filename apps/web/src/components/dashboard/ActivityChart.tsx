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
import { useChartTheme } from '@/hooks/useChartTheme';
import { ActivityChartData } from '@/services/dashboardService';
import { useTranslations } from 'next-intl';

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
  title,
  subtitle,
  height = 300,
  isLoading = false,
  className = '',
}) => {
  const ct = useChartTheme();
  const t = useTranslations('dashboard.activityChart');
  const resolvedTitle = title ?? t('title');
  const resolvedSubtitle = subtitle ?? t('subtitle');
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
        <div className="p-3 rounded-lg shadow-lg" style={{ backgroundColor: ct.tooltipBg, border: "1px solid " + ct.tooltipBorder }}>
          <p className="text-sm font-medium mb-2" style={{ color: ct.tooltipText }}>{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between space-x-4">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  ></div>
                  <span className="text-sm">
                    {entry.dataKey === 'totalActivities' && `${t('activities')}:`}
                    {entry.dataKey === 'logins' && `${t('logins')}:`}
                    {entry.dataKey === 'uniqueUsers' && `${t('users')}:`}
                    {entry.dataKey === 'errors' && `${t('errors')}:`}
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
      totalActivities: t('activities'),
      logins: t('logins'),
      uniqueUsers: t('users'),
      errors: t('errors'),
    };

    return (
      <div className="flex justify-center space-x-6 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            ></div>
            <span className="text-sm" style={{ color: ct.textSecondary }}>{labels[entry.value] || entry.value}</span>
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
            <div className="h-6 bg-surface-3 rounded w-32 mb-2"></div>
            <div className="h-4 bg-surface-3 rounded w-48"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-64 bg-surface-3 rounded"></div>
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
            <h3 className="text-lg font-semibold text-foreground">{resolvedTitle}</h3>
            <p className="text-sm text-foreground/70">{resolvedSubtitle}</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>{t('noData')}</p>
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
            <h3 className="text-lg font-semibold text-foreground">{resolvedTitle}</h3>
            <p className="text-sm text-foreground/70">{resolvedSubtitle}</p>
          </div>

          {/* Métricas rápidas */}
          <div className="flex space-x-6 text-right">
            <div>
              <p className="text-xs text-muted-foreground">{t('activities')}</p>
              <p className="text-sm font-semibold text-blue-600">{totals.totalActivities}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('logins')}</p>
              <p className="text-sm font-semibold text-green-600">{totals.logins}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('errors')}</p>
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
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke={ct.axis} />
              <YAxis tick={{ fontSize: 12 }} stroke={ct.axis} />
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
