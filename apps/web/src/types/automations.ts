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
  | { label: string; type: 'number'; min?: number; max?: number }
  | { label: string; type: 'boolean' }
  | { label: string; type: 'time' }
  | { label: string; type: 'select'; options: { value: string; label: string }[] };

export const PARAM_CONFIG: Record<string, ParamConfigEntry> = {
  umbral_porcentaje: { label: 'Umbral de alerta (%)', type: 'number', min: 1, max: 100 },
  dias_vencimiento: { label: 'Días de vencimiento para avisar', type: 'number', min: 1, max: 90 },
  frecuencia_dias: { label: 'Frecuencia de recordatorio (días)', type: 'number', min: 1, max: 30 },
  max_recordatorios: { label: 'Máximo de recordatorios', type: 'number', min: 1, max: 10 },
  hora: { label: 'Hora de envío', type: 'time' },
  incluir_cobros: { label: 'Incluir cobros en resumen', type: 'boolean' },
  incluir_ventas: { label: 'Incluir ventas en resumen', type: 'boolean' },
  incluir_visitas: { label: 'Incluir visitas en resumen', type: 'boolean' },
  dias_inactividad: { label: 'Días sin actividad', type: 'number', min: 1, max: 90 },
  dias_seguimiento: { label: 'Días para seguimiento', type: 'number', min: 1, max: 30 },
  dias_sin_pedido: { label: 'Días sin pedido', type: 'number', min: 1, max: 60 },
  min_pedidos_historicos: { label: 'Mínimo de pedidos históricos', type: 'number', min: 1, max: 20 },
  dia: {
    label: 'Día de ejecución',
    type: 'select',
    options: [
      { value: '1', label: 'Lunes' },
      { value: '2', label: 'Martes' },
      { value: '3', label: 'Miércoles' },
      { value: '4', label: 'Jueves' },
      { value: '5', label: 'Viernes' },
      { value: '6', label: 'Sábado' },
      { value: '0', label: 'Domingo' },
    ],
  },
  max_paradas: { label: 'Máximo de paradas', type: 'number', min: 1, max: 50 },
  porcentaje_alerta: { label: 'Porcentaje mínimo de cumplimiento', type: 'number', min: 1, max: 100 },
  destinatario: {
    label: '¿A quién notificar?',
    type: 'select',
    options: [
      { value: 'admin', label: 'Solo administrador' },
      { value: 'vendedores', label: 'Solo vendedores' },
      { value: 'ambos', label: 'Admin + vendedores' },
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

export const CATEGORY_LABELS: Record<string, string> = {
  Cobranza: 'Cobranza',
  Ventas: 'Ventas',
  Inventario: 'Inventario',
  Operacion: 'Operación',
};
