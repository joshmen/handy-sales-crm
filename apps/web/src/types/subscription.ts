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
  activeProductos: number;
  activeClientes: number;
  fechaSuscripcion: string | null;
  fechaExpiracion: string | null;
  gracePeriodEnd: string | null;
  cancelledAt: string | null;
  cancellationScheduledFor: string | null;
  hasStripe: boolean;
  nombreEmpresa: string;
  trialEndsAt: string | null;
  trialCardCollected: boolean;
  daysRemaining: number | null;
}

export interface StripeInvoice {
  id: string;
  number: string | null;
  created: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  amountPaid: number;
  amountDue: number;
  currency: string;
  invoicePdfUrl: string | null;
  hostedInvoiceUrl: string | null;
}

export interface StripePaymentMethod {
  id: string;
  type: string;
  cardBrand: string | null;
  cardLast4: string | null;
  cardExpMonth: number | null;
  cardExpYear: number | null;
  isDefault: boolean;
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

// ─── Timbre Balance & Purchase ───

export interface TimbreBalance {
  usados: number;
  maximo: number;
  extras: number;
  disponibles: number;
  allowed: boolean;
  message: string | null;
}

export interface TimbrePurchaseRecord {
  id: number;
  cantidad: number;
  precioMxn: number;
  estado: 'pendiente' | 'completado' | 'fallido';
  creadoEn: string;
  completadoEn: string | null;
}

// ─── Paginated Stripe Result ───

export interface PaginatedStripeResult<T> {
  items: T[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface TimbrePackage {
  id: number;
  nombre: string;
  cantidad: number;
  precioMxn: number;
  precioUnitario: number;
  badge: string | null;
  orden: number;
}
