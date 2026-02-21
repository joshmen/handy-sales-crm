export interface SubscriptionPlan {
  id: number;
  nombre: string;
  codigo: string;
  precioMensual: number;
  precioAnual: number;
  maxUsuarios: number;
  maxProductos: number;
  maxClientesPorMes: number;
  incluyeReportes: boolean;
  incluyeSoportePrioritario: boolean;
  orden: number;
}

export interface SubscriptionStatus {
  planTipo: string | null;
  subscriptionStatus: string;
  maxUsuarios: number;
  activeUsuarios: number;
  fechaSuscripcion: string | null;
  fechaExpiracion: string | null;
  gracePeriodEnd: string | null;
  cancelledAt: string | null;
  hasStripe: boolean;
  nombreEmpresa: string;
}

export interface ScheduledAction {
  id: number;
  actionType: string;
  targetId: number;
  scheduledAt: string;
  executedAt: string | null;
  cancelledAt: string | null;
  status: 'Pending' | 'Executed' | 'Cancelled' | 'Failed';
  notificationSent: boolean;
  reason: string | null;
  createdByUserId: number;
  creadoEn: string;
}
