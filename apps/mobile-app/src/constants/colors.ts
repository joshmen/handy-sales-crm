// Brand
export const PRIMARY = '#2563eb';
export const PRIMARY_DARK = '#1e40af';
export const SUCCESS = '#16a34a';
export const WARNING = '#d97706';
export const DANGER = '#dc2626';
export const INFO = '#7c3aed';

// Backgrounds
export const BG_PRIMARY = '#f8fafc';
export const BG_CARD = '#ffffff';
export const BG_MUTED = '#f1f5f9';

// Text
export const TEXT_PRIMARY = '#0f172a';
export const TEXT_SECONDARY = '#475569';
export const TEXT_MUTED = '#94a3b8';
export const TEXT_LIGHT = '#cbd5e1';

// Borders
export const BORDER_DEFAULT = '#e2e8f0';
export const BORDER_LIGHT = '#f1f5f9';

// Order status (used in both list and detail)
export const ORDER_STATUS_COLORS: Record<number, { bg: string; text: string; label: string }> = {
  0: { bg: '#f1f5f9', text: '#475569', label: 'Borrador' },
  1: { bg: '#fef3c7', text: '#92400e', label: 'Enviado' },
  2: { bg: '#dbeafe', text: '#1e40af', label: 'Confirmado' },
  3: { bg: '#ede9fe', text: '#6b21a8', label: 'En Proceso' },
  4: { bg: '#ffedd5', text: '#9a3412', label: 'En Ruta' },
  5: { bg: '#dcfce7', text: '#166534', label: 'Entregado' },
  6: { bg: '#fee2e2', text: '#991b1b', label: 'Cancelado' },
};
