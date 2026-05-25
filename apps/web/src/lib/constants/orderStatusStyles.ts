/**
 * Audit M-4 (2026-05-25): Antes el archivo orders/page.tsx tenía 22 hardcoded
 * Tailwind class strings esparcidos para estilos de estado. Centralizado aquí
 * para que cualquier cambio de color (rebranding, dark mode) sea un solo lugar.
 *
 * Convention: cada estado lifecycle (`'draft' | 'confirmed' | 'en_route' | 'delivered' | 'cancelled'`)
 * tiene 3 dimensiones de color:
 * - dot: indicador circular en list view
 * - text: label color
 * - border: left border en row (solo para estados accionables)
 *
 * Nota: `Order['status']` (enum OrderStatus) está desincronizado con los strings
 * usados en este UI (legacy desde antes del rename a "estado" en mar 2026).
 * Tipamos como `string` para evitar mantener el enum al día con el UI.
 */
export type OrderUiStatus = 'draft' | 'confirmed' | 'en_route' | 'delivered' | 'cancelled';

export const ESTADO_TO_STATUS: Record<string, OrderUiStatus> = {
  'Borrador': 'draft',
  'Confirmado': 'confirmed',
  'EnRuta': 'en_route',
  'Entregado': 'delivered',
  'Cancelado': 'cancelled',
  // Legacy: old states map to confirmed for backwards compat (mar 2026)
  'Enviado': 'confirmed',
  'EnProceso': 'confirmed',
};

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  confirmed: 'Confirmado',
  en_route: 'En Ruta',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

// Dot color + subtle text — no pastel backgrounds (conscious design call para keep table escaneable).
export const STATUS_DOT_COLORS: Record<string, string> = {
  draft: 'bg-muted-foreground ring-2 ring-border-subtle ring-offset-1',
  confirmed: 'bg-blue-500 ring-2 ring-blue-200 ring-offset-1',
  en_route: 'bg-cyan-500 ring-2 ring-cyan-200 ring-offset-1',
  delivered: 'bg-emerald-500',
  cancelled: 'bg-red-400',
};

export const STATUS_TEXT_COLORS: Record<string, string> = {
  draft: 'text-muted-foreground',
  confirmed: 'text-blue-700',
  en_route: 'text-cyan-700',
  delivered: 'text-emerald-700',
  cancelled: 'text-red-500',
};

// Left border accent for rows needing attention. Vacío = sin border.
export const STATUS_BORDER_COLORS: Record<string, string> = {
  draft: 'border-l-border-default',
  confirmed: 'border-l-blue-400',
  en_route: 'border-l-cyan-400',
  delivered: '',
  cancelled: '',
};

/**
 * Transition map: dado el estado de la API, devuelve la acción primaria forward.
 * Null = estado terminal (Entregado/Cancelado) sin acción siguiente.
 */
export function getNextAction(apiEstado?: string): { label: string; action: string; colorClasses: string } | null {
  switch (apiEstado) {
    case 'Borrador':
      return { label: 'Confirmar', action: 'confirmar', colorClasses: 'border border-blue-300 text-blue-700 hover:bg-blue-50' };
    case 'Confirmado':
      return { label: 'Enviar a Ruta', action: 'en-ruta', colorClasses: 'border border-cyan-300 text-cyan-700 hover:bg-cyan-50' };
    case 'EnRuta':
      return { label: 'Entregar', action: 'entregar', colorClasses: 'bg-emerald-600 text-white hover:bg-emerald-700' };
    default:
      return null;
  }
}
