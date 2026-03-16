/**
 * HandySales Mobile — Design System Colors
 * "Premium Mexican Field Sales" — warm, professional palette
 * Brand color: emerald #16a34a
 */

export const colors = {
  // Brand
  brand: {
    primary: '#16a34a',
    primaryLight: '#22c55e',
    primaryDark: '#15803d',
    secondary: '#2563eb',
    secondaryLight: '#60a5fa',
    accent: '#f59e0b',
    accentLight: '#fbbf24',
  },

  // Backgrounds
  bg: {
    primary: '#f8fafc',
    secondary: '#ffffff',
    tertiary: '#f1f5f9',
    warm: '#fefce8',
    dark: '#0f172a',
    darkSecondary: '#1e293b',
  },

  // Text
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    muted: '#94a3b8',
    inverse: '#ffffff',
    link: '#2563eb',
    success: '#16a34a',
    danger: '#dc2626',
  },

  // Borders
  border: {
    light: '#f1f5f9',
    default: '#e2e8f0',
    strong: '#cbd5e1',
  },

  // Status (semantic — matching web app)
  status: {
    draft: { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' },
    pending: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
    confirmed: { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
    processing: { bg: '#ede9fe', text: '#6b21a8', border: '#ddd6fe' },
    inTransit: { bg: '#ffedd5', text: '#9a3412', border: '#fed7aa' },
    delivered: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
    cancelled: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
  },

  // KPI card gradients (for expo-linear-gradient / LinearGradient)
  gradients: {
    blue: ['#3b82f6', '#1d4ed8'] as const,
    green: ['#22c55e', '#16a34a'] as const,
    orange: ['#f97316', '#ea580c'] as const,
    purple: ['#8b5cf6', '#7c3aed'] as const,
    pink: ['#ec4899', '#db2777'] as const,
    amber: ['#f59e0b', '#d97706'] as const,
    emerald: ['#34d399', '#059669'] as const,
    teal: ['#14b8a6', '#0d9488'] as const,
    red: ['#f87171', '#dc2626'] as const,
    indigo: ['#818cf8', '#4f46e5'] as const,
  },

  // Shadows (used in StyleSheet shadow* props)
  shadow: {
    light: '#0f172a10',
    medium: '#0f172a1a',
    heavy: '#0f172a30',
    colored: {
      blue: '#1d4ed84d',
      green: '#16a34a4d',
      orange: '#ea580c4d',
      purple: '#7c3aed4d',
    },
  },
} as const;

/**
 * Order status map by estado number (matches backend EstadoPedido enum)
 * 0 = Borrador, 1 = Pendiente, 2 = Confirmado, 3 = En Proceso,
 * 4 = En Transito, 5 = Entregado, 6 = Cancelado
 */
export const ORDER_STATUS: Record<number, { label: string; bg: string; text: string; border: string }> = {
  0: { label: 'Borrador', ...colors.status.draft },
  1: { label: 'Pendiente', ...colors.status.pending },
  2: { label: 'Confirmado', ...colors.status.confirmed },
  3: { label: 'En Proceso', ...colors.status.processing },
  4: { label: 'En Transito', ...colors.status.inTransit },
  5: { label: 'Entregado', ...colors.status.delivered },
  6: { label: 'Cancelado', ...colors.status.cancelled },
};

/**
 * Payment status map by estado number (matches backend EstadoPago enum)
 * 0 = Pendiente, 1 = Parcial, 2 = Pagado, 3 = Vencido, 4 = Cancelado
 */
export const PAYMENT_STATUS: Record<number, { label: string; bg: string; text: string; border: string }> = {
  0: { label: 'Pendiente', ...colors.status.pending },
  1: { label: 'Parcial', ...colors.status.processing },
  2: { label: 'Pagado', ...colors.status.delivered },
  3: { label: 'Vencido', bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
  4: { label: 'Cancelado', ...colors.status.cancelled },
};
