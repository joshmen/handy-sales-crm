import { z } from 'zod';

export const SaldoClienteSchema = z
  .object({
    clienteId: z.number(),
    clienteNombre: z.string(),
    totalFacturado: z.number(),
    totalCobrado: z.number(),
    saldoPendiente: z.number(),
    ultimoCobro: z.string().optional(),
  })
  .passthrough();

export type SaldoCliente = z.infer<typeof SaldoClienteSchema>;

export const ResumenCarteraSchema = z
  .object({
    totalFacturado: z.number(),
    totalCobrado: z.number(),
    totalPendiente: z.number(),
    clientesConSaldo: z.number(),
  })
  .passthrough();

export type ResumenCartera = z.infer<typeof ResumenCarteraSchema>;

export const EstadoCuentaMovimientoSchema = z
  .object({
    id: z.number(),
    tipo: z.enum(['factura', 'cobro']),
    fecha: z.string(),
    concepto: z.string(),
    monto: z.number(),
    saldo: z.number(),
  })
  .passthrough();

export type EstadoCuentaMovimiento = z.infer<
  typeof EstadoCuentaMovimientoSchema
>;

export const EstadoCuentaSchema = z
  .object({
    clienteId: z.number(),
    clienteNombre: z.string(),
    totalFacturado: z.number(),
    totalCobrado: z.number(),
    saldoPendiente: z.number(),
    movimientos: z.array(EstadoCuentaMovimientoSchema),
  })
  .passthrough();

export type EstadoCuenta = z.infer<typeof EstadoCuentaSchema>;

export const MobileCobroSchema = z
  .object({
    id: z.number(),
    clienteId: z.number(),
    clienteNombre: z.string(),
    monto: z.number(),
    metodoPago: z.number(),
    metodoPagoNombre: z.string(),
    referencia: z.string().optional(),
    notas: z.string().optional(),
    fecha: z.string(),
    usuarioId: z.number(),
    usuarioNombre: z.string(),
    creadoEn: z.string(),
  })
  .passthrough();

export type MobileCobro = z.infer<typeof MobileCobroSchema>;

// Request types (outgoing — no Zod validation needed)
export interface CobroCreateRequest {
  clienteId: number;
  monto: number;
  metodoPago: number;
  referencia?: string;
  notas?: string;
}
