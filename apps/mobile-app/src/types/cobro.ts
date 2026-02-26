// Response types — re-exported from Zod schemas (source of truth)
export type {
  SaldoCliente,
  ResumenCartera,
  EstadoCuenta,
  EstadoCuentaMovimiento,
  MobileCobro,
} from '@/api/schemas/cobro';

// Request types — re-exported from schemas (plain interfaces, no Zod)
export type { CobroCreateRequest } from '@/api/schemas/cobro';

// Constants (not part of Zod schemas)
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
