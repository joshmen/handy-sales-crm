/**
 * HandySales Mobile — Design System Colors
 * Pencil-aligned color palette — single source of truth.
 *
 * Usage:
 *   import { COLORS } from '@/theme/colors';
 *   // or via barrel: import { COLORS } from '@/theme';
 */

// ---------------------------------------------------------------------------
// Primary palette (flat, Pencil design-system aligned)
// ---------------------------------------------------------------------------

export const COLORS = {
  // Headers
  headerBg: '#1565C0',
  headerText: '#FFFFFF',

  // Actions
  primary: '#4338CA',        // Indigo — active tabs, progress indicators
  primaryLight: '#eef2ff',   // Indigo light background
  button: '#1565C0',         // Blue — action buttons, FAB, selected states
  buttonLight: '#e3f2fd',    // Blue light background for selected states

  // Brand
  brand: '#16a34a',          // Green — Handy brand, toggles active
  brandLight: '#dcfce7',     // Green light

  // Sales / Money
  salesGreen: '#059669',     // Emerald — money amounts

  // Destructive
  destructive: '#E11D48',    // Red — logout, cancel, delete
  destructiveLight: '#fef2f2',

  // Neutral
  background: '#f8fafc',
  card: '#ffffff',
  border: '#f1f5f9',
  borderMedium: '#e2e8f0',

  // Text
  foreground: '#0f172a',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',
  textMuted: '#d4d4d8',

  // Status
  success: '#16a34a',
  warning: '#d97706',
  error: '#dc2626',
  info: '#1565C0',

  // Shadows
  shadowColor: '#00000010',

  // Offline
  offlineBg: '#fef3c7',
  offlineText: '#92400e',
  onlineBg: '#f0fdf4',
  onlineText: '#166534',
} as const;

// ---------------------------------------------------------------------------
// Semantic status palettes (bg/text/border trios for badges & chips)
// ---------------------------------------------------------------------------

export const STATUS_PALETTES = {
  draft:      { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' },
  pending:    { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  confirmed:  { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
  processing: { bg: '#ede9fe', text: '#6b21a8', border: '#ddd6fe' },
  inTransit:  { bg: '#ffedd5', text: '#9a3412', border: '#fed7aa' },
  delivered:  { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
  cancelled:  { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
} as const;

// ---------------------------------------------------------------------------
// KPI card gradients (for expo-linear-gradient / LinearGradient)
// ---------------------------------------------------------------------------

export const GRADIENTS = {
  blue:    ['#3b82f6', '#1d4ed8'] as const,
  green:   ['#22c55e', '#16a34a'] as const,
  orange:  ['#f97316', '#ea580c'] as const,
  purple:  ['#8b5cf6', '#7c3aed'] as const,
  pink:    ['#ec4899', '#db2777'] as const,
  amber:   ['#f59e0b', '#d97706'] as const,
  emerald: ['#34d399', '#059669'] as const,
  teal:    ['#14b8a6', '#0d9488'] as const,
  red:     ['#f87171', '#dc2626'] as const,
  indigo:  ['#818cf8', '#4f46e5'] as const,
} as const;

// ---------------------------------------------------------------------------
// Backward-compatible nested alias
// Existing code that uses `colors.brand.primary`, `colors.text.primary`, etc.
// will keep working. New code should prefer the flat `COLORS` object.
// ---------------------------------------------------------------------------

export const colors = {
  brand: {
    primary: COLORS.brand,
    primaryLight: '#22c55e',
    primaryDark: '#15803d',
    secondary: COLORS.primary,
    secondaryLight: '#818cf8',
    accent: '#f59e0b',
    accentLight: '#fbbf24',
  },
  bg: {
    primary: COLORS.background,
    secondary: COLORS.card,
    tertiary: COLORS.border,
    warm: '#fefce8',
    dark: COLORS.foreground,
    darkSecondary: '#1e293b',
  },
  text: {
    primary: COLORS.foreground,
    secondary: COLORS.textSecondary,
    muted: COLORS.textTertiary,
    inverse: '#ffffff',
    link: COLORS.primary,
    success: COLORS.success,
    danger: COLORS.error,
  },
  border: {
    light: COLORS.border,
    default: COLORS.borderMedium,
    strong: '#cbd5e1',
  },
  status: STATUS_PALETTES,
  gradients: GRADIENTS,
  shadow: {
    light: '#0f172a10',
    medium: '#0f172a1a',
    heavy: '#0f172a30',
    colored: {
      blue: '#4338CA4d',
      green: '#16a34a4d',
      orange: '#ea580c4d',
      purple: '#7c3aed4d',
    },
  },
} as const;

// ---------------------------------------------------------------------------
// Order & Payment status maps (match backend enums)
// ---------------------------------------------------------------------------

/**
 * Order status map by estado number (matches backend EstadoPedido enum)
 * 0 = Borrador, 1 = Pendiente, 2 = Confirmado, 3 = En Proceso,
 * 4 = En Transito, 5 = Entregado, 6 = Cancelado
 */
export const ORDER_STATUS: Record<number, { label: string; bg: string; text: string; border: string }> = {
  0: { label: 'Borrador', ...STATUS_PALETTES.draft },
  1: { label: 'Pendiente', ...STATUS_PALETTES.pending },
  2: { label: 'Confirmado', ...STATUS_PALETTES.confirmed },
  3: { label: 'En Proceso', ...STATUS_PALETTES.processing },
  4: { label: 'En Transito', ...STATUS_PALETTES.inTransit },
  5: { label: 'Entregado', ...STATUS_PALETTES.delivered },
  6: { label: 'Cancelado', ...STATUS_PALETTES.cancelled },
};

/**
 * Payment status map by estado number (matches backend EstadoPago enum)
 * 0 = Pendiente, 1 = Parcial, 2 = Pagado, 3 = Vencido, 4 = Cancelado
 */
export const PAYMENT_STATUS: Record<number, { label: string; bg: string; text: string; border: string }> = {
  0: { label: 'Pendiente', ...STATUS_PALETTES.pending },
  1: { label: 'Parcial', ...STATUS_PALETTES.processing },
  2: { label: 'Pagado', ...STATUS_PALETTES.delivered },
  3: { label: 'Vencido', bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
  4: { label: 'Cancelado', ...STATUS_PALETTES.cancelled },
};
