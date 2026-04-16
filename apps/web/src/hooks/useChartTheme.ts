import { useMemo } from 'react';
import { useTheme } from '@/stores/useUIStore';

/**
 * Returns dark-mode-aware colors for Recharts and ApexCharts components.
 * Uses teal-black palette for dark mode to match the project's design system.
 */
export function useChartTheme() {
  const { theme } = useTheme();

  return useMemo(() => {
    const isDark = theme === 'dark';

    return {
      isDark,
      // Grid & axes
      grid: isDark ? '#2b3539' : '#f3f4f6',
      axis: isDark ? '#7b9099' : '#6b7280',
      // Tooltip
      tooltipBg: isDark ? '#172025' : '#ffffff',
      tooltipBorder: isDark ? '#2b3539' : '#e5e7eb',
      tooltipText: isDark ? '#e4eaed' : '#4b5563',
      // Text (for labels, legends)
      textPrimary: isDark ? '#e4eaed' : '#374151',
      textSecondary: isDark ? '#7b9099' : '#6b7280',
      textMuted: isDark ? '#5a6e78' : '#9ca3af',
      // Stroke / backgrounds
      stroke: isDark ? '#172025' : '#ffffff',
      cardBg: isDark ? '#172025' : '#ffffff',
      // Donut "empty" segment
      emptySegment: isDark ? '#2b3539' : '#e5e7eb',
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
