'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/Button';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/SearchableSelect';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { useReportExport } from '@/hooks/useReportExport';
import { useTranslations } from 'next-intl';
import {
  BarChart3, TrendingUp, Layers, PieChart, Table,
  Play, Loader2, AlertCircle, FileDown,
} from 'lucide-react';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface SourceColumn { name: string; type: 'string' | 'number' | 'date'; label: string; }
interface DataSource { id: string; name: string; columns: SourceColumn[]; }
interface QueryMetric { column: string; aggregate: string; label: string; }
interface QueryPayload { source: string; dimensions: string[]; metrics: QueryMetric[]; orderBy: string; orderDesc: boolean; limit: number; }
interface QueryResult { source: string; columns: { name: string; label: string; type: string }[]; rows: Record<string, unknown>[]; totalRows: number; }

type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'table';

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#ec4899'];

const AGGREGATE_OPTIONS: SearchableSelectOption[] = [
  { value: 'SUM', label: 'SUM' }, { value: 'AVG', label: 'AVG' },
  { value: 'COUNT', label: 'COUNT' }, { value: 'MAX', label: 'MAX' }, { value: 'MIN', label: 'MIN' },
];

const CHART_ICONS: { type: ChartType; icon: React.ElementType; label: string }[] = [
  { type: 'bar', icon: BarChart3, label: 'Bar' }, { type: 'line', icon: TrendingUp, label: 'Line' },
  { type: 'area', icon: Layers, label: 'Area' }, { type: 'pie', icon: PieChart, label: 'Pie' },
  { type: 'table', icon: Table, label: 'Table' },
];

export function ReportBuilder() {
  const t = useTranslations('analytics');
  const tSources = useTranslations('analytics.sources');
  const tc = useTranslations('common');

  const [sources, setSources] = useState<DataSource[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [selectedSourceId, setSelectedSourceId] = useState<string | number | null>(null);
  const [selectedDimension, setSelectedDimension] = useState<string | number | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string | number | null>(null);
  const [selectedAggregate, setSelectedAggregate] = useState<string | number | null>('SUM');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const selectedSource = useMemo(() => sources.find((s) => s.id === selectedSourceId) ?? null, [sources, selectedSourceId]);

  const dimensionOptions: SearchableSelectOption[] = useMemo(() => {
    if (!selectedSource) return [];
    return selectedSource.columns.filter((c) => c.type === 'string' || c.type === 'date').map((c) => ({ value: c.name, label: c.label }));
  }, [selectedSource]);

  const metricOptions: SearchableSelectOption[] = useMemo(() => {
    if (!selectedSource) return [];
    return selectedSource.columns.filter((c) => c.type === 'number').map((c) => ({ value: c.name, label: c.label }));
  }, [selectedSource]);

  const sourceOptions: SearchableSelectOption[] = useMemo(
    () => sources.map((s) => {
      try { return { value: s.id, label: tSources(s.id) }; }
      catch { return { value: s.id, label: s.name }; }
    }),
    [sources, tSources],
  );

  useEffect(() => { setSelectedDimension(null); setSelectedMetric(null); setResult(null); setError(null); }, [selectedSourceId]);

  const fetchSources = useCallback(async () => {
    try { setLoadingSources(true); const res = await api.get<DataSource[]>('/api/analytics/sources'); setSources(res.data); }
    catch { toast.error(t('errorLoading')); }
    finally { setLoadingSources(false); }
  }, [t]);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  const handleRun = useCallback(async () => {
    if (!selectedSourceId || !selectedDimension || !selectedMetric) return;
    const metricCol = selectedSource?.columns.find((c) => c.name === selectedMetric);
    const payload: QueryPayload = {
      source: selectedSourceId as string,
      dimensions: [selectedDimension as string],
      metrics: [{ column: selectedMetric as string, aggregate: (selectedAggregate as string) ?? 'SUM', label: metricCol?.label ?? (selectedMetric as string) }],
      orderBy: selectedMetric as string, orderDesc: true, limit: 50,
    };
    try { setRunning(true); setError(null); const res = await api.post<QueryResult>('/api/analytics/query', payload); setResult(res.data); }
    catch { setError(t('errorLoading')); toast.error(t('errorLoading')); }
    finally { setRunning(false); }
  }, [selectedSourceId, selectedDimension, selectedMetric, selectedAggregate, selectedSource, t]);

  const canRun = !!selectedSourceId && !!selectedDimension && !!selectedMetric && !running;
  const chartCategories = useMemo(() => result ? result.rows.map((r) => String(r[selectedDimension as string] ?? '')) : [], [result, selectedDimension]);
  const chartSeriesData = useMemo(() => result ? result.rows.map((r) => Number(r[selectedMetric as string] ?? 0)) : [], [result, selectedMetric]);
  const metricLabel = useMemo(() => selectedSource?.columns.find((c) => c.name === selectedMetric)?.label ?? (selectedMetric as string) ?? '', [selectedSource, selectedMetric]);

  // PDF export — same format as all other reports
  const sourceName = useMemo(() => {
    if (!selectedSourceId) return t('title');
    try { return tSources(selectedSourceId as string); } catch { return selectedSource?.name ?? t('title'); }
  }, [selectedSourceId, selectedSource, tSources, t]);

  const { exportPDF, exporting } = useReportExport({
    fileName: 'custom-report',
    title: `${sourceName} — ${metricLabel}`,
    chartRef: chartRef as React.RefObject<HTMLElement | null>,
    table: result && result.rows.length > 0 ? {
      headers: result.columns.map(c => c.label),
      rows: result.rows.map(row => result.columns.map(col =>
        col.type === 'number' ? Number(row[col.name] ?? 0).toLocaleString() : String(row[col.name] ?? '')
      )),
    } : undefined,
  });

  const apexOptions: ApexCharts.ApexOptions = useMemo(() => {
    if (chartType === 'pie') {
      return { chart: { type: 'pie', background: 'transparent' }, labels: chartCategories, colors: CHART_COLORS, legend: { position: 'bottom', labels: { colors: '#9ca3af' } }, dataLabels: { enabled: true } };
    }
    return {
      chart: { type: chartType === 'area' ? 'area' : chartType === 'line' ? 'line' : 'bar', background: 'transparent', toolbar: { show: true } },
      xaxis: { categories: chartCategories, labels: { style: { colors: '#9ca3af' } } },
      yaxis: { labels: { style: { colors: '#9ca3af' } } },
      colors: CHART_COLORS, dataLabels: { enabled: false },
      grid: { borderColor: '#e5e7eb', strokeDashArray: 3 },
      fill: chartType === 'area' ? { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } } : {},
      tooltip: { shared: true, intersect: false },
    };
  }, [chartType, chartCategories]);

  const apexSeries = useMemo(() => chartType === 'pie' ? chartSeriesData : [{ name: metricLabel, data: chartSeriesData }], [chartType, chartSeriesData, metricLabel]);

  return (
    <div className="space-y-4">
      {/* Config bar */}
      <div className="bg-surface-2 rounded-xl border border-border-subtle p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-[200px]">
            <SearchableSelect options={sourceOptions} value={selectedSourceId} onChange={setSelectedSourceId} placeholder={t('selectSource')} disabled={loadingSources} />
          </div>
          <div className="bg-surface-3 rounded-lg p-1 flex gap-0.5">
            {CHART_ICONS.map(({ type, icon: Icon, label }) => (
              <button key={type} onClick={() => setChartType(type)} title={label}
                className={`p-2 rounded-md transition-all duration-150 ${chartType === type ? 'bg-surface-2 shadow-elevation-1 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
          <Button size="sm" onClick={handleRun} disabled={!canRun}>
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            {running ? t('running') : t('run')}
          </Button>
          {result && result.rows.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportPDF} disabled={exporting}>
              {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
              {exporting ? t('running') : t('exportPdf')}
            </Button>
          )}
        </div>
        {selectedSource && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-[200px]">
              <SearchableSelect options={dimensionOptions} value={selectedDimension} onChange={setSelectedDimension} placeholder={t('selectDimension')} />
            </div>
            <div className="w-[200px]">
              <SearchableSelect options={metricOptions} value={selectedMetric} onChange={setSelectedMetric} placeholder={t('selectMetric')} />
            </div>
            <div className="w-[120px]">
              <SearchableSelect options={AGGREGATE_OPTIONS} value={selectedAggregate} onChange={setSelectedAggregate} placeholder={t('selectAggregate')} hideSearch />
            </div>
          </div>
        )}
      </div>

      {loadingSources && <div className="flex flex-col items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary mb-3" /><p className="text-sm text-muted-foreground">{tc('loading')}</p></div>}
      {!loadingSources && !selectedSourceId && !result && <div className="flex flex-col items-center justify-center py-24 text-muted-foreground"><BarChart3 className="w-16 h-16 mb-4 text-muted-foreground/30" /><p className="text-sm font-medium">{t('configHint')}</p></div>}
      {!loadingSources && selectedSourceId && !result && !running && !error && <div className="flex flex-col items-center justify-center py-24 text-muted-foreground"><Play className="w-12 h-12 mb-4 text-muted-foreground/30" /><p className="text-sm font-medium">{t('configHint')}</p></div>}
      {running && <div className="flex flex-col items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary mb-3" /><p className="text-sm text-muted-foreground">{t('running')}</p></div>}
      {error && !running && <div className="flex flex-col items-center justify-center py-24 text-muted-foreground"><AlertCircle className="w-12 h-12 mb-3 text-destructive/50" /><p className="text-sm font-medium">{error}</p><Button variant="outline" size="sm" className="mt-4" onClick={handleRun}>{tc('retry')}</Button></div>}

      {result && !running && (
        <div className="space-y-4 animate-fade-in">
          {result.rows.length === 0 && <div className="flex flex-col items-center justify-center py-24 text-muted-foreground"><Table className="w-12 h-12 mb-3 text-muted-foreground/30" /><p className="text-sm font-medium">{t('noResults')}</p></div>}
          {result.rows.length > 0 && chartType !== 'table' && (
            <div ref={chartRef} className="bg-surface-2 rounded-xl border border-border-subtle shadow-elevation-1 p-4">
              <Chart options={apexOptions} series={apexSeries} type={chartType === 'pie' ? 'pie' : chartType === 'area' ? 'area' : chartType === 'line' ? 'line' : 'bar'} height={380} />
            </div>
          )}
          {result.rows.length > 0 && (
            <div className="bg-surface-2 rounded-xl border border-border-subtle shadow-elevation-1 overflow-hidden">
              <div className="px-4 py-3 border-b border-border-subtle"><span className="text-xs text-muted-foreground">{result.totalRows} {t('rows')}</span></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border-subtle bg-surface-3/50">
                    {result.columns.map((col) => <th key={col.name} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{col.label}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-border-subtle">
                    {result.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-surface-3/30 transition-colors">
                        {result.columns.map((col) => <td key={col.name} className="px-4 py-2.5 text-foreground whitespace-nowrap">{col.type === 'number' ? Number(row[col.name] ?? 0).toLocaleString() : String(row[col.name] ?? '')}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
