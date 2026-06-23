'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import {
  getDashboardEjecutivo,
  getVentasPeriodo,
  getVentasCategoria,
  type DashboardEjecutivoResponse,
  type VentaPeriodo,
  type VentaCategoria,
} from '@/services/api/reports';
import { useChartTheme } from '@/hooks/useChartTheme';
import { useFormatters } from '@/hooks/useFormatters';
import { useReportExport } from '@/hooks/useReportExport';
import { DollarSign, Receipt, Target, UserPlus, Loader2, Download } from 'lucide-react';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

type Periodo = 'semana' | 'mes' | 'trimestre';

// Paleta del donut por categoría (vibra del mockup Claude Design: azul primario, ámbar, azul, verde…).
const CATEGORY_PALETTE = ['#0176D3', '#D97706', '#2563EB', '#16A34A', '#DB2777', '#0891B2', '#94A3B8'];

/** Rango de fechas + agrupación del gráfico según el período seleccionado. */
function rangeForPeriodo(periodo: Periodo): { desde: string; hasta: string; agrupacion: 'dia' | 'semana' | 'mes' } {
  const hasta = new Date();
  const desde = new Date();
  if (periodo === 'semana') {
    desde.setDate(desde.getDate() - 7);
    return { desde: desde.toISOString(), hasta: hasta.toISOString(), agrupacion: 'dia' };
  }
  if (periodo === 'trimestre') {
    desde.setMonth(desde.getMonth() - 3);
    return { desde: desde.toISOString(), hasta: hasta.toISOString(), agrupacion: 'mes' };
  }
  desde.setMonth(desde.getMonth() - 1);
  return { desde: desde.toISOString(), hasta: hasta.toISOString(), agrupacion: 'semana' };
}

/**
 * Cabecera del catálogo de Reportes (espejo del ReportsPage del mockup): selector de período +
 * Exportar PDF, 4 KPIs, tendencia de ventas (línea) y ventas por categoría (donut).
 * Todo con dato REAL: `/api/reports/ejecutivo`, `/ventas-periodo` y `/ventas-categoria`.
 */
export function ReportsDashboardHero() {
  const t = useTranslations('reports.dashboard');
  const chart = useChartTheme();
  const { formatCurrency } = useFormatters();

  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [exec, setExec] = useState<DashboardEjecutivoResponse | null>(null);
  const [serie, setSerie] = useState<VentaPeriodo[]>([]);
  // Totales del MISMO rango que las gráficas (para que el KPI de ventas case con la tendencia y el donut).
  const [periodoTotales, setPeriodoTotales] = useState<{ totalVentas: number; ticketPromedio: number } | null>(null);
  const [categorias, setCategorias] = useState<VentaCategoria[]>([]);
  const [totalCategoria, setTotalCategoria] = useState(0);
  const [loading, setLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { desde, hasta, agrupacion } = rangeForPeriodo(periodo);
    try {
      const [e, s, c] = await Promise.all([
        getDashboardEjecutivo({ periodo }),
        getVentasPeriodo({ desde, hasta, agrupacion }),
        getVentasCategoria({ desde, hasta }),
      ]);
      setExec(e);
      setSerie(s.periodos);
      setPeriodoTotales(s.totales);
      setCategorias(c.categorias);
      setTotalCategoria(c.totalGeneral);
    } catch {
      // Silencioso: el catálogo de reportes de abajo sigue disponible aunque falle el resumen.
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => { load(); }, [load]);

  const { exportPDF, exporting } = useReportExport({
    fileName: 'reportes-dashboard',
    title: t('exportTitle'),
    kpis: exec ? [
      { label: t('kpiSales'), value: formatCurrency(periodoTotales?.totalVentas ?? exec.ventas.total) },
      { label: t('kpiTicket'), value: formatCurrency(periodoTotales?.ticketPromedio ?? exec.ventas.ticketPromedio) },
      { label: t('kpiEffectiveness'), value: `${exec.visitas.efectividadPct}%` },
      { label: t('kpiNewClients'), value: exec.nuevosClientes },
    ] : undefined,
    table: categorias.length ? {
      headers: [t('byCategory'), t('total'), '%'],
      rows: categorias.map(c => [c.categoria, formatCurrency(c.totalVentas), `${c.porcentajeDelTotal}%`]),
    } : undefined,
    fallbackRef: contentRef,
  });

  // ── KPIs (4) — Ventas del mes (con delta real), Ticket promedio, Efectividad de visitas, Nuevos clientes ──
  const kpiCards: Array<{
    title: string;
    value: string;
    delta?: number;
    hint?: string;
    icon: React.ComponentType<{ className?: string }>;
    valueClass: string;
  }> = [
    { title: t('kpiSales'), value: periodoTotales ? formatCurrency(periodoTotales.totalVentas) : (exec ? formatCurrency(exec.ventas.total) : '—'), delta: exec?.ventas.crecimientoPct, icon: DollarSign, valueClass: 'text-primary' },
    { title: t('kpiTicket'), value: periodoTotales ? formatCurrency(periodoTotales.ticketPromedio) : (exec ? formatCurrency(exec.ventas.ticketPromedio) : '—'), hint: t('perOrder'), icon: Receipt, valueClass: 'text-foreground' },
    { title: t('kpiEffectiveness'), value: exec ? `${exec.visitas.efectividadPct}%` : '—', hint: t('effectivenessHint'), icon: Target, valueClass: 'text-green-600' },
    { title: t('kpiNewClients'), value: exec ? String(exec.nuevosClientes) : '—', hint: t('inPeriod'), icon: UserPlus, valueClass: 'text-foreground' },
  ];

  // ── Línea: tendencia de ventas ──
  const lineSeries = [{ name: t('salesTrend'), data: serie.map(p => p.totalVentas) }];
  const lineOptions: ApexCharts.ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 500 }, zoom: { enabled: false } },
    colors: ['#0176D3'],
    stroke: { curve: 'smooth', width: 2 },
    dataLabels: { enabled: false },
    grid: { borderColor: chart.grid, strokeDashArray: 3, padding: { left: 8, right: 8 } },
    xaxis: {
      categories: serie.map(p => fmtLabel(p.fecha)),
      labels: { style: { fontSize: '12px', colors: chart.textSecondary } },
      axisBorder: { color: chart.grid },
      axisTicks: { color: chart.grid },
      tooltip: { enabled: false },
    },
    yaxis: { labels: { style: { fontSize: '12px', colors: chart.textSecondary }, formatter: (v: number) => `$${(v / 1000).toFixed(0)}k` } },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0, stops: [5, 95] } },
    tooltip: { y: { formatter: (v: number) => formatCurrency(v) } },
    legend: { show: false },
  };

  // ── Donut: ventas por categoría ──
  const donutOptions: ApexCharts.ApexOptions = {
    chart: { type: 'donut', animations: { enabled: true, speed: 700 } },
    labels: categorias.map(c => c.categoria),
    colors: CATEGORY_PALETTE,
    legend: { position: 'bottom', fontSize: '12px', labels: { colors: chart.textSecondary } },
    dataLabels: { enabled: false },
    stroke: { width: 2, colors: [chart.stroke] },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            total: { show: true, label: t('total'), fontSize: '12px', color: chart.textSecondary, formatter: () => abbreviate(totalCategoria) },
          },
        },
      },
    },
    tooltip: { y: { formatter: (v: number) => formatCurrency(v) } },
  };

  return (
    <div className="space-y-5" data-tour="reports-hero">
      {/* Toolbar: Exportar PDF + selector de período */}
      <div className="flex items-center justify-end gap-2">
        {exec && !loading && (
          <button
            onClick={exportPDF}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground/80 bg-card border border-border rounded-lg hover:bg-surface-1 disabled:opacity-50 transition-colors"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {t('exportPdf')}
          </button>
        )}
        <div className="flex gap-1 bg-surface-3 rounded-lg p-1" role="group" aria-label={t('periodSelector')}>
          {(['semana', 'mes', 'trimestre'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              aria-pressed={periodo === p}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                periodo === p ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p === 'semana' ? t('week') : p === 'mes' ? t('month') : t('quarter')}
            </button>
          ))}
        </div>
      </div>

      <div ref={contentRef} className="space-y-5" key={periodo}>
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map(card => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
                  <Icon className="w-5 h-5 text-muted-foreground/40" />
                </div>
                <p className={`text-2xl sm:text-3xl font-bold tracking-tight tabular-nums mt-3 ${card.valueClass} ${loading ? 'animate-pulse' : ''}`}>
                  {card.value}
                </p>
                {typeof card.delta === 'number' ? (
                  <p className={`text-xs mt-2 font-medium ${card.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {card.delta > 0 ? '+' : ''}{card.delta}% <span className="text-muted-foreground font-normal">{t('vsPrior')}</span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">{card.hint ?? ' '}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Gráficos: tendencia (2fr) + categoría (1fr) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-4">{t('salesTrend')}</h3>
            {serie.length > 0 ? (
              <Chart key={chart.isDark ? 'dark' : 'light'} type="area" options={lineOptions} series={lineSeries} height={280} />
            ) : (
              <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">{t('noData')}</div>
            )}
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-4">{t('byCategory')}</h3>
            {categorias.length > 0 ? (
              <Chart key={chart.isDark ? 'dark' : 'light'} type="donut" options={donutOptions} series={categorias.map(c => c.totalVentas)} height={280} />
            ) : (
              <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">{t('noData')}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────

/** Etiqueta corta de eje X a partir de una fecha ISO (cae al string crudo si no parsea). */
function fmtLabel(fecha: string): string {
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

/** "$842K" para el centro del donut. */
function abbreviate(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}
