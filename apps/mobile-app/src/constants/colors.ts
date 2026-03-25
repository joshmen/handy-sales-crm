/**
 * Backward-compatible re-exports from the design system.
 * New code should import directly from '@/theme/colors' or '@/theme'.
 */
export { COLORS } from '@/theme/colors';

// Legacy flat constants — mapped to the new design system
import { COLORS } from '@/theme/colors';

export const PRIMARY = COLORS.primary;
export const PRIMARY_DARK = '#312e81'; // indigo-900
export const SUCCESS = COLORS.success;
export const WARNING = COLORS.warning;
export const DANGER = COLORS.error;
export const INFO = COLORS.info;

export const BG_PRIMARY = COLORS.background;
export const BG_CARD = COLORS.card;
export const BG_MUTED = COLORS.border;

export const TEXT_PRIMARY = COLORS.foreground;
export const TEXT_SECONDARY = COLORS.textSecondary;
export const TEXT_MUTED = COLORS.textTertiary;
export const TEXT_LIGHT = '#cbd5e1';

export const BORDER_DEFAULT = COLORS.borderMedium;
export const BORDER_LIGHT = COLORS.border;

// Order status (used in both list and detail)
import { STATUS_PALETTES } from '@/theme/colors';

export const ORDER_STATUS_COLORS: Record<number, { bg: string; text: string; label: string }> = {
  0: { bg: STATUS_PALETTES.draft.bg, text: STATUS_PALETTES.draft.text, label: 'Borrador' },
  1: { bg: STATUS_PALETTES.confirmed.bg, text: STATUS_PALETTES.confirmed.text, label: 'Confirmado' }, // Legacy backwards compat
  2: { bg: STATUS_PALETTES.confirmed.bg, text: STATUS_PALETTES.confirmed.text, label: 'Confirmado' },
  3: { bg: STATUS_PALETTES.confirmed.bg, text: STATUS_PALETTES.confirmed.text, label: 'Confirmado' }, // Legacy backwards compat
  4: { bg: STATUS_PALETTES.inTransit.bg, text: STATUS_PALETTES.inTransit.text, label: 'En Ruta' },
  5: { bg: STATUS_PALETTES.delivered.bg, text: STATUS_PALETTES.delivered.text, label: 'Entregado' },
  6: { bg: STATUS_PALETTES.cancelled.bg, text: STATUS_PALETTES.cancelled.text, label: 'Cancelado' },
};
