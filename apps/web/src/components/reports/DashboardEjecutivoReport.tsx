'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getDashboardEjecutivo, DashboardEjecutivoResponse } from '@/services/api/reports';
import { toast } from '@/hooks/useToast';
import {
  Card,
  Metric,
  Text,
  Flex,
  BadgeDelta,
  DonutChart,
  BarList,
  ProgressBar,
  SparkAreaChart,
  CategoryBar,
  Legend,
} from '@tremor/react';
import { ShoppingCart, Eye, UserPlus, Trophy, Star, AlertTriangle, Loader2, Download } from 'lucide-react';
import { useReportExport } from '@/hooks/useReportExport';
import { useFormatters } from '@/hooks/useFormatters';
import { useTranslations } from 'next-intl';

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

  const fetch = useCallback(async () => {
    try { setLoading(true); setData(await getDashboardEjecutivo({ periodo })); }
    catch { toast.error(tCommon('errorLoadingDashboard')); }
    finally { setLoading(false); }
  }, [periodo]);

  useEffect(() => { fetch(); }, [periodo]);

  const periodoLabel = periodo === 'semana' ? t('thisWeek') : periodo === 'trimestre' ? t('thisQuarter') : t('thisMonth');

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">{t('summary')} <span className="font-semibold text-gray-900">{periodoLabel}</span></p>
        <div className="flex items-center gap-2">
          {data && !loading && (
            <button onClick={exportPDF} disabled={exporting} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              PDF
            </button>
          )}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['semana', 'mes', 'trimestre'] as const).map(p => (
              <button key={p} onClick={() => setPeriodo(p)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${periodo === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
                {p === 'semana' ? t('week') : p === 'mes' ? t('month') : t('quarter')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
        </div>
      )}

      {!loading && !data && (
        <div className="text-center py-16 text-sm text-gray-400">{tCommon('noData')}</div>
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
                    <Text className="!text-gray-400">{t('salesTitle')}</Text>
                  </Flex>
                  <Metric className="!text-white !text-5xl sm:!text-6xl !font-bold !tracking-tight">
                    {fmt(data.ventas.total)}
                  </Metric>
                  <Text className="!text-gray-400 mt-2">{t('totalSales')} · {periodoLabel}</Text>
                </div>
                <div className="text-right">
                  <BadgeDelta
                    deltaType={data.ventas.crecimientoPct >= 0 ? 'increase' : 'decrease'}
                    size="lg"
                  >
                    {data.ventas.crecimientoPct > 0 ? '+' : ''}{data.ventas.crecimientoPct}%
                  </BadgeDelta>
                  <Text className="!text-gray-500 mt-1 text-xs">{t('vsPriorPeriod')}</Text>
                </div>
              </Flex>

              {/* Sub-metrics */}
              <div className="grid grid-cols-3 gap-6 mt-8 pt-6 border-t border-white/10">
                <div>
                  <Text className="!text-gray-500">{t('orders')}</Text>
                  <Metric className="!text-white !text-2xl !font-semibold mt-1">{data.ventas.pedidos}</Metric>
                </div>
                <div>
                  <Text className="!text-gray-500">{t('avgTicket')}</Text>
                  <Metric className="!text-white !text-2xl !font-semibold mt-1">{fmt(data.ventas.ticketPromedio)}</Metric>
                </div>
                <div>
                  <Text className="!text-gray-500">{t('newClientsTitle')}</Text>
                  <Metric className="!text-white !text-2xl !font-semibold mt-1">{data.nuevosClientes}</Metric>
                </div>
              </div>
            </div>
          </Card>

          {/* ── Row 2: Visits + Breakdown ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Visits donut */}
            <Card className="lg:col-span-2 page-animate page-animate-delay-2">
              <Flex justifyContent="start" className="gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-blue-50"><Eye className="w-4 h-4 text-blue-600" /></div>
                <Text className="!font-semibold !text-gray-900">{t('visitsTitle')}</Text>
              </Flex>
              <Flex justifyContent="start" alignItems="end" className="gap-4">
                <Metric className="!text-4xl !font-bold">{data.visitas.total}</Metric>
                <BadgeDelta deltaType="unchanged" size="sm">{data.visitas.efectividadPct}%</BadgeDelta>
              </Flex>
              <div className="mt-6">
                <DonutChart
                  data={[
                    { name: t('withSale', { count: data.visitas.conVenta }), value: data.visitas.conVenta },
                    { name: t('withoutSale', { count: data.visitas.sinVenta }), value: data.visitas.sinVenta || 1 },
                  ]}
                  category="value"
                  index="name"
                  colors={['blue', 'slate']}
                  variant="pie"
                  className="h-32 mt-2"
                  showLabel
                  showAnimation
                />
                <Legend
                  categories={[t('withSale', { count: data.visitas.conVenta }), t('withoutSale', { count: data.visitas.sinVenta })]}
                  colors={['blue', 'slate']}
                  className="mt-3 justify-center"
                />
              </div>
            </Card>

            {/* Performance metrics */}
            <Card className="lg:col-span-3 page-animate page-animate-delay-3">
              <Text className="!font-semibold !text-gray-900 mb-4">{t('salesTitle')} — {periodoLabel}</Text>
              <BarList
                data={[
                  { name: t('totalSales'), value: data.ventas.total, color: 'emerald' },
                  { name: t('avgTicket'), value: data.ventas.ticketPromedio, color: 'blue' },
                  ...(data.topVendedor ? [{ name: `🏆 ${data.topVendedor.nombre}`, value: data.topVendedor.totalVentas, color: 'violet' as const }] : []),
                  ...(data.topProducto ? [{ name: `⭐ ${data.topProducto.nombre}`, value: data.topProducto.totalVentas, color: 'rose' as const }] : []),
                ]}
                valueFormatter={fmt}
                showAnimation
                className="mt-2"
              />
            </Card>
          </div>

          {/* ── Row 3: Top Vendor + Star Product + Alerts ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 page-animate page-animate-delay-4">
            {/* Top Vendor */}
            <Card decoration="top" decorationColor="violet">
              <Flex justifyContent="start" className="gap-2">
                <div className="p-1.5 rounded-lg bg-violet-50"><Trophy className="w-4 h-4 text-violet-600" /></div>
                <Text className="!font-semibold !text-gray-900">{t('topVendor')}</Text>
              </Flex>
              {data.topVendedor ? (
                <div className="mt-4">
                  <Text className="!text-gray-500">{data.topVendedor.nombre}</Text>
                  <Metric className="!text-violet-600 mt-1">{fmt(data.topVendedor.totalVentas)}</Metric>
                  <CategoryBar
                    values={[100]}
                    colors={['violet']}
                    className="mt-4"
                    showLabels={false}
                  />
                </div>
              ) : <Text className="mt-4 !text-gray-400">{t('noData')}</Text>}
            </Card>

            {/* Star Product */}
            <Card decoration="top" decorationColor="rose">
              <Flex justifyContent="start" className="gap-2">
                <div className="p-1.5 rounded-lg bg-rose-50"><Star className="w-4 h-4 text-rose-500" /></div>
                <Text className="!font-semibold !text-gray-900">{t('starProduct')}</Text>
              </Flex>
              {data.topProducto ? (
                <div className="mt-4">
                  <Text className="!text-gray-500">{data.topProducto.nombre}</Text>
                  <Metric className="!text-rose-500 mt-1">{fmt(data.topProducto.totalVentas)}</Metric>
                  <Text className="mt-2">{data.topProducto.cantidadVendida} {t('units')}</Text>
                </div>
              ) : <Text className="mt-4 !text-gray-400">{t('noData')}</Text>}
            </Card>

            {/* Alerts */}
            <Card decoration="top" decorationColor={data.alertas.inventarioBajo > 0 ? 'red' : 'green'}>
              <Flex justifyContent="start" className="gap-2">
                <div className={`p-1.5 rounded-lg ${data.alertas.inventarioBajo > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <AlertTriangle className={`w-4 h-4 ${data.alertas.inventarioBajo > 0 ? 'text-red-500' : 'text-green-500'}`} />
                </div>
                <Text className="!font-semibold !text-gray-900">{t('alertsTitle')}</Text>
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
