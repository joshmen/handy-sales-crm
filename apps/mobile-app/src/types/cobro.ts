export interface SaldoCliente {
  clienteId: number;
  clienteNombre: string;
  totalFacturado: number;
  totalCobrado: number;
  saldoPendiente: number;
  ultimoCobro?: string;
}

export interface ResumenCartera {
  totalFacturado: number;
  totalCobrado: number;
  totalPendiente: number;
  clientesConSaldo: number;
}

export interface EstadoCuenta {
  clienteId: number;
  clienteNombre: string;
  totalFacturado: number;
  totalCobrado: number;
  saldoPendiente: number;
  movimientos: EstadoCuentaMovimiento[];
}

export interface EstadoCuentaMovimiento {
  id: number;
  tipo: 'factura' | 'cobro';
  fecha: string;
  concepto: string;
  monto: number;
  saldo: number;
}

export interface MobileCobro {
  id: number;
  clienteId: number;
  clienteNombre: string;
  monto: number;
  metodoPago: number;
  metodoPagoNombre: string;
  referencia?: string;
  notas?: string;
  fecha: string;
  usuarioId: number;
  usuarioNombre: string;
  creadoEn: string;
}

export interface CobroCreateRequest {
  clienteId: number;
  monto: number;
  metodoPago: number;
  referencia?: string;
  notas?: string;
}

export const METODO_PAGO: Record<number, string> = {
  0: 'Efectivo',
  1: 'Transferencia',
  2: 'Cheque',
  3: 'T. Crédito',
  4: 'T. Débito',
  5: 'Otro',
};

export const METODO_PAGO_ICONS: Record<number, string> = {
  0: 'Banknote',
  1: 'ArrowRightLeft',
  2: 'FileText',
  3: 'CreditCard',
  4: 'CreditCard',
  5: 'MoreHorizontal',
};
