import { z } from 'zod';

export const MobileDetallePedidoSchema = z
  .object({
    id: z.number(),
    productoId: z.number(),
    productoNombre: z.string(),
    productoSku: z.string().optional(),
    productoImagen: z.string().optional(),
    cantidad: z.number(),
    precioUnitario: z.number(),
    descuento: z.number(),
    porcentajeDescuento: z.number(),
    subtotal: z.number(),
    impuesto: z.number(),
    total: z.number(),
    notas: z.string().optional(),
  })
  .passthrough();

export type MobileDetallePedido = z.infer<typeof MobileDetallePedidoSchema>;

export const MobilePedidoSchema = z
  .object({
    id: z.number(),
    numeroPedido: z.string(),
    clienteId: z.number(),
    clienteNombre: z.string(),
    usuarioId: z.number(),
    usuarioNombre: z.string(),
    fechaPedido: z.string(),
    fechaEntregaEstimada: z.string().optional(),
    fechaEntregaReal: z.string().optional(),
    estado: z.number(),
    estadoNombre: z.string(),
    subtotal: z.number(),
    descuento: z.number(),
    impuestos: z.number(),
    total: z.number(),
    notas: z.string().optional(),
    direccionEntrega: z.string().optional(),
    latitud: z.number().optional(),
    longitud: z.number().optional(),
    listaPrecioId: z.number().optional(),
    listaPrecioNombre: z.string().optional(),
    detalles: z.array(MobileDetallePedidoSchema),
    creadoEn: z.string(),
    actualizadoEn: z.string().optional(),
  })
  .passthrough();

export type MobilePedido = z.infer<typeof MobilePedidoSchema>;

// Request types (outgoing — no Zod validation needed)
export interface PedidoCreateRequest {
  clienteId: number;
  fechaEntregaEstimada?: string;
  notas?: string;
  direccionEntrega?: string;
  latitud?: number;
  longitud?: number;
  listaPrecioId?: number;
  detalles: DetallePedidoCreateRequest[];
}

export interface DetallePedidoCreateRequest {
  productoId: number;
  cantidad: number;
  precioUnitario?: number;
  descuento?: number;
  porcentajeDescuento?: number;
  notas?: string;
}
