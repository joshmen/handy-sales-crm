import { useApiQuery } from './useApiQuery';
import { useAppStore } from '@/stores/useAppStore';
import { DashboardMetrics } from '@/types';

interface DateRange {
  startDate: string;
  endDate: string;
}

export function useDashboardMetrics(dateRange?: DateRange) {
  const { setMetrics } = useAppStore();

  const queryKey = ['dashboard-metrics', JSON.stringify(dateRange || {})];

  return useApiQuery<DashboardMetrics>(
    queryKey,
    '/api/dashboard/metrics',
    {
      method: 'GET',
      params: dateRange,
    },
    {
      onSuccess: data => {
        setMetrics(data);
      },
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchInterval: 5 * 60 * 1000, // 5 minutes
    }
  );
}

export function useDashboardCharts(dateRange?: DateRange) {
  const queryKey = ['dashboard-charts', JSON.stringify(dateRange || {})];

  return useApiQuery(
    queryKey,
    '/api/dashboard/charts',
    {
      method: 'GET',
      params: dateRange,
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
}

export function useDashboard(dateRange?: DateRange) {
  const metrics = useDashboardMetrics(dateRange);
  const charts = useDashboardCharts(dateRange);

  return {
    metrics: metrics.data,
    charts: charts.data,
    loading: metrics.loading || charts.loading,
    error: metrics.error || charts.error,
    refetch: () => {
      metrics.refetch();
      charts.refetch();
    },
  };
}
