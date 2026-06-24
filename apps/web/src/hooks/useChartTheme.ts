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
      // Chart series — paleta de marca del Claude Design (SLDS azul-led).
      // Serie única/primaria = azul de marca; categórica = donut del diseño
      // (#1F8A5B verde, azul, ámbar, slate) extendida con índigo/violeta.
      series: {
        blue: '#0176D3', // primary brand (var --primary)
        green: '#1F8A5B', // verde del diseño (donut/positivo)
        red: '#EF4444',
        amber: '#D97706', // ámbar del diseño
        purple: '#5867E8', // índigo (catálogo)
        cyan: '#06A59A', // teal (operación)
        brandGreen: '#1F8A5B',
        slate: '#94A3B8', // 4ª categoría neutra del donut
      },
      // Orden categórico para charts multi-serie (donut/zona), igual al mock.
      categorical: ['#1F8A5B', '#0176D3', '#D97706', '#94A3B8', '#5867E8', '#9050E9'],
    };
  }, [theme]);
}
