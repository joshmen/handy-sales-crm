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

// PR 5 cobros 3 modos: espejo del web/backend.
// 0 = aplicacion a un pedido especifico (vendedor elige pedido).
// 1 = abono a cuenta — backend distribuye FIFO contra pedidos abiertos.
// 2 = anticipo — genera saldo a favor del cliente (gated por plan).
export enum ModoCobro {
  PorPedido = 0,
  AbonoFifo = 1,
  Anticipo = 2,
}

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
