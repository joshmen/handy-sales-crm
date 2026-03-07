import { useMemo } from 'react';
import { useTheme } from '@/stores/useUIStore';

/**
 * Returns dark-mode-aware colors for Recharts components.
 * Reads the current theme and provides appropriate hex values
 * for grid lines, axis text, tooltips, and chart series.
 */
export function useChartTheme() {
  const { theme } = useTheme();

  return useMemo(() => {
    const isDark = theme === 'dark';

    return {
      // Grid & axes
      grid: isDark ? '#2a2d35' : '#f0f0f0',
      axis: isDark ? '#8b8fa3' : '#6b7280',
      // Tooltip
      tooltipBg: isDark ? '#1e2028' : '#ffffff',
      tooltipBorder: isDark ? '#2a2d35' : '#e5e7eb',
      tooltipText: isDark ? '#e0e2ea' : '#4b5563',
      // Text (for labels, legends)
      textPrimary: isDark ? '#e0e2ea' : '#111827',
      textSecondary: isDark ? '#8b8fa3' : '#6b7280',
      textMuted: isDark ? '#6b7080' : '#9ca3af',
      // Chart series (same in both modes — sufficient contrast)
      series: {
        blue: '#3b82f6',
        green: '#10b981',
        red: '#ef4444',
        amber: '#f59e0b',
        purple: '#8b5cf6',
        cyan: '#06b6d4',
        brandGreen: '#16a34a',
      },
    };
  }, [theme]);
}
