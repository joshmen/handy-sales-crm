'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { getDashboardEjecutivo, DashboardEjecutivoResponse } from '@/services/api/reports';
import { toast } from '@/hooks/useToast';
import { Card, Metric, Text, Flex, BadgeDelta, BarList } from '@tremor/react';
import { ShoppingCart, Eye, UserPlus, Trophy, Star, AlertTriangle, Loader2, Download } from 'lucide-react';
import { useReportExport } from '@/hooks/useReportExport';
import { useFormatters } from '@/hooks/useFormatters';
import { useTranslations } from 'next-intl';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export function DashboardEjecutivoReport() {
  const { formatCurrency } = useFormatters();
  const t = useTranslations('reports.ejecutivo');
  const tCommon = useTranslations('reports.common');
  const fmt = (n: number) => formatCurrency(n);
  const [periodo, setPeriodo] = useState<'semana' | 'mes' | 'trimestre'>('mes');
  const [data, setData] = useState<DashboardEjecutivoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const { exportPDF, exporting } = useReportExport({
    fileName: 'executive-dashboard',
    title: t('summary'),
    kpis: data ? [
      { label: t('salesTitle'), value: fmt(data.ventas.total) },
      { label: t('orders'), value: data.ventas.pedidos },
      { label: t('visitsTitle'), value: data.visitas.total },
      { label: t('newClientsTitle'), value: data.nuevosClientes },
    ] : undefined,
    table: data ? {
      headers: [t('salesTitle'), t('orders'), t('avgTicket'), t('vsPriorPeriod'), t('visitsTitle'), t('newClientsTitle')],
      rows: [[fmt(data.ventas.total), data.ventas.pedidos, fmt(data.ventas.ticketPromedio), `${data.ventas.crecimientoPct > 0 ? '+' : ''}${data.ventas.crecimientoPct}%`, `${data.visitas.total} (${data.visitas.efectividadPct}%)`, data.nuevosClientes]],
    } : undefined,
    fallbackRef: contentRef,
  });

  const loadData = useCallback(async () => {
    try { setLoading(true); setData(await getDashboardEjecutivo({ periodo })); }
    catch { toast.error(tCommon('errorLoadingDashboard')); }
    finally { setLoading(false); }
  }, [periodo]);

  useEffect(() => { loadData(); }, [loadData]);

  const periodoLabel = periodo === 'semana' ? t('thisWeek') : periodo === 'trimestre' ? t('thisQuarter') : t('thisMonth');

  // Donut chart for visits
  const donutOptions: ApexCharts.ApexOptions = {
    chart: { type: 'donut', animations: { enabled: true, speed: 800 } },
    labels: data ? [t('withSale', { count: data.visitas.conVenta }), t('withoutSale', { count: data.visitas.sinVenta })] : [],
    colors: ['#3b82f6', '#e5e7eb'],
    plotOptions: { pie: { donut: { size: '70%', labels: { show: true, total: { show: true, label: t('visitsTitle'), fontSize: '12px', color: '#6b7280', formatter: () => data ? String(data.visitas.total) : '0' } } } } },
    legend: { position: 'bottom', fontSize: '12px' },
    dataLabels: { enabled: false },
    stroke: { width: 2, colors: ['#ffffff'] },
  };

  // Bar chart for sales breakdown
  const barOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, animations: { enabled: true, speed: 600 } },
    plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: '60%' } },
    colors: ['#10b981'],
    grid: { borderColor: '#f3f4f6', strokeDashArray: 3, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    dataLabels: { enabled: true, formatter: (v) => fmt(Number(v)), style: { fontSize: '11px', colors: ['#374151'] }, offsetX: 5 },
    xaxis: { labels: { formatter: (v) => `$${(Number(v) / 1000).toFixed(0)}k`, style: { fontSize: '11px', colors: '#9ca3af' } } },
    yaxis: { labels: { style: { fontSize: '11px', colors: '#374151' } } },
    tooltip: { y: { formatter: (v) => fmt(v) } },
  };

  const barSeries = data ? [{
    name: t('salesTitle'),
    data: [
      ...(data.topVendedor ? [{ x: `🏆 ${data.topVendedor.nombre}`, y: data.topVendedor.totalVentas }] : []),
      ...(data.topProducto ? [{ x: `⭐ ${data.topProducto.nombre}`, y: data.topProducto.totalVentas }] : []),
      { x: t('avgTicket'), y: data.ventas.ticketPromedio },
    ],
  }] : [];

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground/70">{t('summary')} <span className="font-semibold text-foreground">{periodoLabel}</span></p>
        <div className="flex items-center gap-2">
          {data && !loading && (
            <button onClick={exportPDF} disabled={exporting} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground/80 bg-white border border-border-default rounded-lg hover:bg-surface-1 disabled:opacity-50 transition-colors">
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              PDF
            </button>
          )}
          <div className="flex gap-1 bg-surface-3 rounded-lg p-1" role="group" aria-label="Period selector">
            {(['semana', 'mes', 'trimestre'] as const).map(p => (
              <button key={p} onClick={() => setPeriodo(p)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${periodo === p ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {p === 'semana' ? t('week') : p === 'mes' ? t('month') : t('quarter')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/60" />
        </div>
      )}

      {!loading && !data && (
        <div className="text-center py-16 text-sm text-muted-foreground">{tCommon('noData')}</div>
      )}

      {data && !loading && (
        <div ref={contentRef} className="space-y-5" key={periodo}>

          {/* ── Row 1: Sales Hero ── */}
          <Card className="page-animate page-animate-delay-1 !p-0 overflow-hidden">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 sm:p-8">
              <Flex justifyContent="between" alignItems="start">
                <div>
                  <Flex justifyContent="start" className="gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-white/10"><ShoppingCart className="w-5 h-5 text-emerald-400" /></div>
                    <Text className="!text-muted-foreground">{t('salesTitle')}</Text>
                  </Flex>
                  <p className="text-5xl sm:text-6xl font-bold text-white tracking-tight">{fmt(data.ventas.total)}</p>
                  <p className="text-sm text-muted-foreground mt-2">{t('totalSales')} · {periodoLabel}</p>
                </div>
                <div className="text-right">
                  <BadgeDelta deltaType={data.ventas.crecimientoPct >= 0 ? 'increase' : 'decrease'} size="lg">
                    {data.ventas.crecimientoPct > 0 ? '+' : ''}{data.ventas.crecimientoPct}%
                  </BadgeDelta>
                  <p className="text-xs text-muted-foreground mt-1">{t('vsPriorPeriod')}</p>
                </div>
              </Flex>
              <div className="grid grid-cols-3 gap-6 mt-8 pt-6 border-t border-white/10">
                <div>
                  <p className="text-xs text-muted-foreground">{t('orders')}</p>
                  <p className="text-2xl font-semibold text-white mt-1">{data.ventas.pedidos}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('avgTicket')}</p>
                  <p className="text-2xl font-semibold text-white mt-1">{fmt(data.ventas.ticketPromedio)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('newClientsTitle')}</p>
                  <p className="text-2xl font-semibold text-white mt-1">{data.nuevosClientes}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* ── Row 2: Visits Donut + Sales Breakdown ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <Card className="lg:col-span-2 page-animate page-animate-delay-2">
              <Flex justifyContent="start" className="gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-blue-50"><Eye className="w-4 h-4 text-blue-600" /></div>
                <Text className="!font-semibold !text-foreground">{t('visitsTitle')}</Text>
              </Flex>
              <p className="text-3xl font-bold text-foreground mb-1">{data.visitas.total}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 mb-4">{data.visitas.efectividadPct}%</span>
              <Chart type="donut" options={donutOptions} series={[data.visitas.conVenta, data.visitas.sinVenta || 0]} height={220} />
            </Card>

            <Card className="lg:col-span-3 page-animate page-animate-delay-3">
              <Text className="!font-semibold !text-foreground mb-4">{t('salesTitle')} — {periodoLabel}</Text>
              <Chart type="bar" options={barOptions} series={barSeries} height={200} />
            </Card>
          </div>

          {/* ── Row 3: Top Vendor + Star Product + Alerts ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 page-animate page-animate-delay-4">
            <Card decoration="top" decorationColor="violet">
              <Flex justifyContent="start" className="gap-2">
                <div className="p-1.5 rounded-lg bg-violet-50"><Trophy className="w-4 h-4 text-violet-600" /></div>
                <Text className="!font-semibold !text-foreground">{t('topVendor')}</Text>
              </Flex>
              {data.topVendedor ? (
                <div className="mt-4">
                  <Text className="!text-muted-foreground">{data.topVendedor.nombre}</Text>
                  <Metric className="!text-violet-600 mt-1">{fmt(data.topVendedor.totalVentas)}</Metric>
                </div>
              ) : <Text className="mt-4 !text-muted-foreground">{t('noData')}</Text>}
            </Card>

            <Card decoration="top" decorationColor="rose">
              <Flex justifyContent="start" className="gap-2">
                <div className="p-1.5 rounded-lg bg-rose-50"><Star className="w-4 h-4 text-rose-500" /></div>
                <Text className="!font-semibold !text-foreground">{t('starProduct')}</Text>
              </Flex>
              {data.topProducto ? (
                <div className="mt-4">
                  <Text className="!text-muted-foreground">{data.topProducto.nombre}</Text>
                  <Metric className="!text-rose-500 mt-1">{fmt(data.topProducto.totalVentas)}</Metric>
                  <Text className="mt-2">{data.topProducto.cantidadVendida} {t('units')}</Text>
                </div>
              ) : <Text className="mt-4 !text-muted-foreground">{t('noData')}</Text>}
            </Card>

            <Card decoration="top" decorationColor={data.alertas.inventarioBajo > 0 ? 'red' : 'green'}>
              <Flex justifyContent="start" className="gap-2">
                <div className={`p-1.5 rounded-lg ${data.alertas.inventarioBajo > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <AlertTriangle className={`w-4 h-4 ${data.alertas.inventarioBajo > 0 ? 'text-red-500' : 'text-green-500'}`} />
                </div>
                <Text className="!font-semibold !text-foreground">{t('alertsTitle')}</Text>
              </Flex>
              <div className="mt-4">
                {data.alertas.inventarioBajo > 0 ? (
                  <>
                    <Metric className="!text-red-500">{data.alertas.inventarioBajo}</Metric>
                    <Text className="mt-1">{t('lowStockAlert', { count: data.alertas.inventarioBajo })}</Text>
                  </>
                ) : (
                  <>
                    <Metric className="!text-green-600">✓</Metric>
                    <Text className="mt-1">{tCommon('noData')}</Text>
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
