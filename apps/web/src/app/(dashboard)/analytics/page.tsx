'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/SearchableSelect';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { useTranslations } from 'next-intl';
import {
  BarChart3,
  TrendingUp,
  Layers,
  PieChart,
  Table,
  Play,
  Loader2,
  AlertCircle,
  FileDown,
} from 'lucide-react';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

// ---------- Types ----------

interface SourceColumn {
  name: string;
  type: 'string' | 'number' | 'date';
  label: string;
}

interface DataSource {
  id: string;
  name: string;
  columns: SourceColumn[];
}

interface QueryMetric {
  column: string;
  aggregate: string;
  label: string;
}

interface QueryPayload {
  source: string;
  dimensions: string[];
  metrics: QueryMetric[];
  orderBy: string;
  orderDesc: boolean;
  limit: number;
}

interface QueryResult {
  source: string;
  columns: { name: string; label: string; type: string }[];
  rows: Record<string, unknown>[];
  totalRows: number;
}

type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'table';

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#ec4899'];

const AGGREGATE_OPTIONS: SearchableSelectOption[] = [
  { value: 'SUM', label: 'SUM' },
  { value: 'AVG', label: 'AVG' },
  { value: 'COUNT', label: 'COUNT' },
  { value: 'MAX', label: 'MAX' },
  { value: 'MIN', label: 'MIN' },
];

const CHART_ICONS: { type: ChartType; icon: React.ElementType; label: string }[] = [
  { type: 'bar', icon: BarChart3, label: 'Bar' },
  { type: 'line', icon: TrendingUp, label: 'Line' },
  { type: 'area', icon: Layers, label: 'Area' },
  { type: 'pie', icon: PieChart, label: 'Pie' },
  { type: 'table', icon: Table, label: 'Table' },
];

// ---------- Component ----------

export default function AnalyticsPage() {
  const t = useTranslations('analytics');
  const tc = useTranslations('common');

  // Sources
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);

  // Config
  const [selectedSourceId, setSelectedSourceId] = useState<string | number | null>(null);
  const [selectedDimension, setSelectedDimension] = useState<string | number | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string | number | null>(null);
  const [selectedAggregate, setSelectedAggregate] = useState<string | number | null>('SUM');
  const [chartType, setChartType] = useState<ChartType>('bar');

  // Results
  const [result, setResult] = useState<QueryResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived
  const selectedSource = useMemo(
    () => sources.find((s) => s.id === selectedSourceId) ?? null,
    [sources, selectedSourceId],
  );

  const dimensionOptions: SearchableSelectOption[] = useMemo(() => {
    if (!selectedSource) return [];
    return selectedSource.columns
      .filter((c) => c.type === 'string' || c.type === 'date')
      .map((c) => ({ value: c.name, label: c.label }));
  }, [selectedSource]);

  const metricOptions: SearchableSelectOption[] = useMemo(() => {
    if (!selectedSource) return [];
    return selectedSource.columns
      .filter((c) => c.type === 'number')
      .map((c) => ({ value: c.name, label: c.label }));
  }, [selectedSource]);

  const sourceOptions: SearchableSelectOption[] = useMemo(
    () => sources.map((s) => ({ value: s.id, label: s.name })),
    [sources],
  );

  // Reset dimension/metric when source changes
  useEffect(() => {
    setSelectedDimension(null);
    setSelectedMetric(null);
    setResult(null);
    setError(null);
  }, [selectedSourceId]);

  // Fetch sources on mount
  const fetchSources = useCallback(async () => {
    try {
      setLoadingSources(true);
      const res = await api.get<DataSource[]>('/api/analytics/sources');
      setSources(res.data);
    } catch {
      toast.error(t('errorLoading'));
    } finally {
      setLoadingSources(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  // Run query
  const handleRun = useCallback(async () => {
    if (!selectedSourceId || !selectedDimension || !selectedMetric) return;

    const metricCol = selectedSource?.columns.find((c) => c.name === selectedMetric);
    const payload: QueryPayload = {
      source: selectedSourceId as string,
      dimensions: [selectedDimension as string],
      metrics: [
        {
          column: selectedMetric as string,
          aggregate: (selectedAggregate as string) ?? 'SUM',
          label: metricCol?.label ?? (selectedMetric as string),
        },
      ],
      orderBy: selectedMetric as string,
      orderDesc: true,
      limit: 50,
    };

    try {
      setRunning(true);
      setError(null);
      const res = await api.post<QueryResult>('/api/analytics/query', payload);
      setResult(res.data);
    } catch {
      setError(t('errorLoading'));
      toast.error(t('errorLoading'));
    } finally {
      setRunning(false);
    }
  }, [selectedSourceId, selectedDimension, selectedMetric, selectedAggregate, selectedSource, t]);

  // Export PDF (basic print)
  const handleExportPdf = useCallback(() => {
    window.print();
  }, []);

  // Chart options
  const canRun = !!selectedSourceId && !!selectedDimension && !!selectedMetric && !running;

  const chartCategories = useMemo(() => {
    if (!result || !selectedDimension) return [];
    return result.rows.map((r) => String(r[selectedDimension as string] ?? ''));
  }, [result, selectedDimension]);

  const chartSeriesData = useMemo(() => {
    if (!result || !selectedMetric) return [];
    return result.rows.map((r) => Number(r[selectedMetric as string] ?? 0));
  }, [result, selectedMetric]);

  const metricLabel = useMemo(() => {
    if (!selectedSource || !selectedMetric) return '';
    return selectedSource.columns.find((c) => c.name === selectedMetric)?.label ?? (selectedMetric as string);
  }, [selectedSource, selectedMetric]);

  const apexOptions: ApexCharts.ApexOptions = useMemo(() => {
    if (chartType === 'pie') {
      return {
        chart: { type: 'pie', background: 'transparent' },
        labels: chartCategories,
        colors: CHART_COLORS,
        legend: { position: 'bottom', labels: { colors: '#9ca3af' } },
        dataLabels: { enabled: true },
      };
    }
    return {
      chart: { type: chartType === 'area' ? 'area' : chartType === 'line' ? 'line' : 'bar', background: 'transparent', toolbar: { show: true } },
      xaxis: { categories: chartCategories, labels: { style: { colors: '#9ca3af' } } },
      yaxis: { labels: { style: { colors: '#9ca3af' } } },
      colors: CHART_COLORS,
      dataLabels: { enabled: false },
      grid: { borderColor: '#374151', strokeDashArray: 3 },
      fill: chartType === 'area' ? { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } } : {},
      tooltip: { theme: 'dark' },
    };
  }, [chartType, chartCategories]);

  const apexSeries = useMemo(() => {
    if (chartType === 'pie') return chartSeriesData;
    return [{ name: metricLabel, data: chartSeriesData }];
  }, [chartType, chartSeriesData, metricLabel]);

  return (
    <PageHeader
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: t('title') },
      ]}
      title={t('title')}
      subtitle={t('subtitle')}
      actions={
        <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={!result}>
          <FileDown className="w-4 h-4 mr-2" />
          {t('exportPdf')}
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Config bar */}
        <div className="bg-surface-2 rounded-xl border border-border-subtle p-4 space-y-3">
          {/* Row 1: Source + Chart type icons + Run */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-[200px]">
              <SearchableSelect
                options={sourceOptions}
                value={selectedSourceId}
                onChange={setSelectedSourceId}
                placeholder={t('selectSource')}
                disabled={loadingSources}
              />
            </div>

            {/* Chart type selector */}
            <div className="bg-surface-3 rounded-lg p-1 flex gap-0.5">
              {CHART_ICONS.map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  title={label}
                  className={`p-2 rounded-md transition-all duration-150 ${
                    chartType === type
                      ? 'bg-surface-2 shadow-elevation-1 text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>

            <Button
              size="sm"
              onClick={handleRun}
              disabled={!canRun}
            >
              {running ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {running ? t('running') : t('run')}
            </Button>
          </div>

          {/* Row 2: Dimension + Metric + Aggregate */}
          {selectedSource && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-[200px]">
                <SearchableSelect
                  options={dimensionOptions}
                  value={selectedDimension}
                  onChange={setSelectedDimension}
                  placeholder={t('selectDimension')}
                />
              </div>
              <div className="w-[200px]">
                <SearchableSelect
                  options={metricOptions}
                  value={selectedMetric}
                  onChange={setSelectedMetric}
                  placeholder={t('selectMetric')}
                />
              </div>
              <div className="w-[120px]">
                <SearchableSelect
                  options={AGGREGATE_OPTIONS}
                  value={selectedAggregate}
                  onChange={setSelectedAggregate}
                  placeholder={t('selectAggregate')}
                  hideSearch
                />
              </div>
            </div>
          )}
        </div>

        {/* Loading sources */}
        {loadingSources && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">{tc('loading')}</p>
          </div>
        )}

        {/* Empty state: no source selected */}
        {!loadingSources && !selectedSourceId && !result && (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <BarChart3 className="w-16 h-16 mb-4 text-muted-foreground/30" />
            <p className="text-sm font-medium">{t('configHint')}</p>
          </div>
        )}

        {/* Empty state: source selected but not run yet */}
        {!loadingSources && selectedSourceId && !result && !running && !error && (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Play className="w-12 h-12 mb-4 text-muted-foreground/30" />
            <p className="text-sm font-medium">{t('configHint')}</p>
          </div>
        )}

        {/* Running spinner */}
        {running && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">{t('running')}</p>
          </div>
        )}

        {/* Error state */}
        {error && !running && (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mb-3 text-destructive/50" />
            <p className="text-sm font-medium">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={handleRun}>
              {tc('retry')}
            </Button>
          </div>
        )}

        {/* Results */}
        {result && !running && (
          <div className="space-y-4 animate-fade-in">
            {/* No results */}
            {result.rows.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                <Table className="w-12 h-12 mb-3 text-muted-foreground/30" />
                <p className="text-sm font-medium">{t('noResults')}</p>
              </div>
            )}

            {/* Chart */}
            {result.rows.length > 0 && chartType !== 'table' && (
              <div className="bg-surface-2 rounded-xl border border-border-subtle shadow-elevation-1 p-4">
                <Chart
                  options={apexOptions}
                  series={apexSeries}
                  type={chartType === 'pie' ? 'pie' : chartType === 'area' ? 'area' : chartType === 'line' ? 'line' : 'bar'}
                  height={380}
                />
              </div>
            )}

            {/* Data table */}
            {result.rows.length > 0 && (
              <div className="bg-surface-2 rounded-xl border border-border-subtle shadow-elevation-1 overflow-hidden">
                <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {result.totalRows} {t('rows')}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-subtle bg-surface-3/50">
                        {result.columns.map((col) => (
                          <th
                            key={col.name}
                            className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {result.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-surface-3/30 transition-colors">
                          {result.columns.map((col) => (
                            <td key={col.name} className="px-4 py-2.5 text-foreground whitespace-nowrap">
                              {col.type === 'number'
                                ? Number(row[col.name] ?? 0).toLocaleString()
                                : String(row[col.name] ?? '')}
                            </td>
                          ))}
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
    </PageHeader>
  );
}
