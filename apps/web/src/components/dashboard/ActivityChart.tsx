import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { useChartTheme } from '@/hooks/useChartTheme';
import { ActivityChartData } from '@/services/dashboardService';
import { useTranslations } from 'next-intl';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

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

  // Colores para cada metrica (mismos que la version recharts)
  const colors = useMemo(
    () => ({
      totalActivities: '#3b82f6', // Azul
      logins: '#10b981', // Verde
      uniqueUsers: '#8b5cf6', // Purpura
      errors: '#ef4444', // Rojo
    }),
    []
  );

  // Calcular metricas totales — memoized since data array can be large
  const totals = useMemo(
    () =>
      data.reduce(
        (acc, item) => ({
          totalActivities: acc.totalActivities + item.totalActivities,
          logins: acc.logins + item.logins,
          uniqueUsers: acc.uniqueUsers + item.uniqueUsers,
          errors: acc.errors + item.errors,
        }),
        { totalActivities: 0, logins: 0, uniqueUsers: 0, errors: 0 }
      ),
    [data]
  );

  // 4 series area: actividades, logins, usuarios, errores
  const series = useMemo(
    () => [
      { name: t('activities'), data: data.map((d) => d.totalActivities) },
      { name: t('logins'), data: data.map((d) => d.logins) },
      { name: t('users'), data: data.map((d) => d.uniqueUsers) },
      { name: t('errors'), data: data.map((d) => d.errors) },
    ],
    [data, t]
  );

  const options: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: 'area',
        toolbar: { show: false },
        fontFamily: 'inherit',
        animations: { enabled: true, speed: 500 },
      },
      colors: [colors.totalActivities, colors.logins, colors.uniqueUsers, colors.errors],
      stroke: { curve: 'smooth', width: 2 },
      dataLabels: { enabled: false },
      // Gradient solo para actividades y logins; usuarios y errores sin relleno
      fill: {
        type: ['gradient', 'gradient', 'solid', 'solid'],
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.3,
          opacityTo: 0,
          stops: [5, 95],
        },
        opacity: [1, 1, 0, 0],
      },
      grid: { borderColor: ct.grid, strokeDashArray: 3, padding: { left: 8, right: 8 } },
      xaxis: {
        categories: data.map((d) => d.date),
        labels: { style: { fontSize: '12px', colors: ct.textSecondary } },
        axisBorder: { color: ct.grid },
        axisTicks: { color: ct.grid },
      },
      yaxis: { labels: { style: { fontSize: '12px', colors: ct.textSecondary } } },
      legend: {
        position: 'bottom',
        labels: { colors: ct.textSecondary },
        markers: { size: 6 },
        itemMargin: { horizontal: 10 },
      },
      tooltip: {
        shared: true,
        intersect: false,
        custom: ({ series: s, dataPointIndex, w }) => {
          const label = data[dataPointIndex]?.date ?? '';
          const rows = (w.globals.seriesNames as string[])
            .map((name, i) => {
              const val = s[i]?.[dataPointIndex] ?? 0;
              const color = w.globals.colors[i];
              return `<div class="flex items-center justify-between gap-4 py-0.5">
                <div class="flex items-center gap-2"><span style="width:10px;height:10px;border-radius:9999px;background:${color};display:inline-block"></span><span style="font-size:13px">${name}</span></div>
                <span style="font-size:13px;font-weight:600">${val}</span></div>`;
            })
            .join('');
          return `<div style="padding:10px 12px;border-radius:8px;background:${ct.tooltipBg};border:1px solid ${ct.tooltipBorder};color:${ct.tooltipText}">
            <p style="font-size:13px;font-weight:500;margin-bottom:6px">${label}</p>
            ${rows}
          </div>`;
        },
      },
    }),
    [colors, ct, data]
  );

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
        <Chart
          key={ct.isDark ? 'dark' : 'light'}
          type="area"
          height={height}
          options={options}
          series={series}
        />
      </CardContent>
    </Card>
  );
};
