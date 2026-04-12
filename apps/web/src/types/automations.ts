export interface AutomationTemplate {
  id: number;
  slug: string;
  nombre: string;
  descripcion: string;
  descripcionCorta: string;
  icono: string;
  categoria: string;
  triggerType: string;
  actionType: string;
  tier: string;
  orden: number;
  // Per-tenant status
  activada: boolean;
  paramsJson: string | null;
  defaultParamsJson: string | null;
  ultimaEjecucion: string | null;
  totalEjecuciones: number;
}

export interface AutomationExecution {
  id: number;
  templateSlug: string;
  templateNombre: string;
  triggerEntity: string | null;
  triggerEntityId: number | null;
  status: 'Success' | 'Failed' | 'Skipped';
  actionTaken: string;
  errorMessage: string | null;
  ejecutadoEn: string;
}

export type ParamConfigEntry =
  | { labelKey: string; type: 'number'; min?: number; max?: number }
  | { labelKey: string; type: 'boolean' }
  | { labelKey: string; type: 'time' }
  | { labelKey: string; type: 'select'; optionKeys: { value: string; labelKey: string }[] };

/**
 * Parameter configuration — uses translation keys (resolved via t() in the component).
 * Keys are under 'automations.params.*' namespace.
 */
export const PARAM_CONFIG: Record<string, ParamConfigEntry> = {
  umbral_porcentaje: { labelKey: 'params.umbralPorcentaje', type: 'number', min: 1, max: 100 },
  dias_vencimiento: { labelKey: 'params.diasVencimiento', type: 'number', min: 1, max: 90 },
  frecuencia_dias: { labelKey: 'params.frecuenciaDias', type: 'number', min: 1, max: 30 },
  max_recordatorios: { labelKey: 'params.maxRecordatorios', type: 'number', min: 1, max: 10 },
  hora: { labelKey: 'params.hora', type: 'time' },
  incluir_cobros: { labelKey: 'params.incluirCobros', type: 'boolean' },
  incluir_ventas: { labelKey: 'params.incluirVentas', type: 'boolean' },
  incluir_visitas: { labelKey: 'params.incluirVisitas', type: 'boolean' },
  dias_inactividad: { labelKey: 'params.diasInactividad', type: 'number', min: 1, max: 90 },
  dias_seguimiento: { labelKey: 'params.diasSeguimiento', type: 'number', min: 1, max: 30 },
  dias_sin_pedido: { labelKey: 'params.diasSinPedido', type: 'number', min: 1, max: 60 },
  min_pedidos_historicos: { labelKey: 'params.minPedidosHistoricos', type: 'number', min: 1, max: 20 },
  dia: {
    labelKey: 'params.dia',
    type: 'select',
    optionKeys: [
      { value: '1', labelKey: 'params.days.monday' },
      { value: '2', labelKey: 'params.days.tuesday' },
      { value: '3', labelKey: 'params.days.wednesday' },
      { value: '4', labelKey: 'params.days.thursday' },
      { value: '5', labelKey: 'params.days.friday' },
      { value: '6', labelKey: 'params.days.saturday' },
      { value: '0', labelKey: 'params.days.sunday' },
    ],
  },
  max_paradas: { labelKey: 'params.maxParadas', type: 'number', min: 1, max: 50 },
  porcentaje_alerta: { labelKey: 'params.porcentajeAlerta', type: 'number', min: 1, max: 100 },
  destinatario: {
    labelKey: 'params.destinatario',
    type: 'select',
    optionKeys: [
      { value: 'admin', labelKey: 'params.recipientOptions.admin' },
      { value: 'vendedores', labelKey: 'params.recipientOptions.vendors' },
      { value: 'ambos', labelKey: 'params.recipientOptions.both' },
    ],
  },
};

/** Badge colors (light backgrounds, used inside cards) */
export const CATEGORY_COLORS: Record<string, string> = {
  Cobranza: 'bg-rose-100 text-rose-700',
  Ventas: 'bg-indigo-100 text-indigo-700',
  Inventario: 'bg-amber-100 text-amber-700',
  Operacion: 'bg-cyan-100 text-cyan-700',
};

/** Tab colors (solid backgrounds, used in category filter) */
export const CATEGORY_TAB_COLORS: Record<string, string> = {
  Todas: 'bg-green-600 text-white',
  Cobranza: 'bg-rose-600 text-white',
  Ventas: 'bg-indigo-600 text-white',
  Inventario: 'bg-amber-600 text-white',
  Operacion: 'bg-cyan-600 text-white',
};

/**
 * Category label translation keys — resolved via t() in the component.
 * Keys are under 'automations.categories.*' namespace.
 */
export const CATEGORY_LABEL_KEYS: Record<string, string> = {
  Cobranza: 'categories.cobranza',
  Ventas: 'categories.ventas',
  Inventario: 'categories.inventario',
  Operacion: 'categories.operacion',
};

/**
 * Automation template name/description translation keys.
 * The backend sends names in Spanish; frontend resolves via t().
 * Keys are under 'automations.templates.*' namespace.
 */
export const TEMPLATE_KEYS: Record<string, { nameKey: string; descKey: string; shortDescKey: string }> = {
  'stock-bajo-alerta': { nameKey: 'templates.stockBajo.name', descKey: 'templates.stockBajo.desc', shortDescKey: 'templates.stockBajo.short' },
  'resumen-diario': { nameKey: 'templates.resumenDiario.name', descKey: 'templates.resumenDiario.desc', shortDescKey: 'templates.resumenDiario.short' },
  'bienvenida-cliente': { nameKey: 'templates.bienvenida.name', descKey: 'templates.bienvenida.desc', shortDescKey: 'templates.bienvenida.short' },
  'cobro-vencido-recordatorio': { nameKey: 'templates.cobroVencido.name', descKey: 'templates.cobroVencido.desc', shortDescKey: 'templates.cobroVencido.short' },
  'cliente-inactivo-visita': { nameKey: 'templates.clienteInactivo.name', descKey: 'templates.clienteInactivo.desc', shortDescKey: 'templates.clienteInactivo.short' },
  'pedido-recurrente': { nameKey: 'templates.pedidoRecurrente.name', descKey: 'templates.pedidoRecurrente.desc', shortDescKey: 'templates.pedidoRecurrente.short' },
  'ruta-semanal-auto': { nameKey: 'templates.rutaSemanal.name', descKey: 'templates.rutaSemanal.desc', shortDescKey: 'templates.rutaSemanal.short' },
  'meta-no-cumplida': { nameKey: 'templates.metaNoCumplida.name', descKey: 'templates.metaNoCumplida.desc', shortDescKey: 'templates.metaNoCumplida.short' },
  'cobro-exitoso-aviso': { nameKey: 'templates.cobroExitoso.name', descKey: 'templates.cobroExitoso.desc', shortDescKey: 'templates.cobroExitoso.short' },
  'inventario-critico': { nameKey: 'templates.inventarioCritico.name', descKey: 'templates.inventarioCritico.desc', shortDescKey: 'templates.inventarioCritico.short' },
  'meta-auto-renovacion': { nameKey: 'templates.metaAutoRenovacion.name', descKey: 'templates.metaAutoRenovacion.desc', shortDescKey: 'templates.metaAutoRenovacion.short' },
};
