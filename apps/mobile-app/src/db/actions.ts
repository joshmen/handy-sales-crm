import { database } from './database';
import Pedido from './models/Pedido';
import DetallePedido from './models/DetallePedido';
import Cobro from './models/Cobro';
import Visita from './models/Visita';

export interface OfflineOrderItem {
  productoId: string;
  productoServerId: number | null;
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
}

const IVA_RATE = 0.16;

/**
 * Create a pedido + detalles offline in WatermelonDB.
 * WDB marks them as `created` — next sync push sends them to server.
 */
export async function createPedidoOffline(
  clienteId: string,
  clienteServerId: number | null,
  usuarioId: number,
  items: OfflineOrderItem[],
  notas?: string
): Promise<Pedido> {
  const subtotal = items.reduce((sum, i) => sum + i.precioUnitario * i.cantidad, 0);
  const impuesto = subtotal * IVA_RATE;
  const total = subtotal + impuesto;

  return database.write(async () => {
    const pedido = await database.get<Pedido>('pedidos').create((record: any) => {
      record.serverId = null;
      record.clienteId = clienteId;
      record.clienteServerId = clienteServerId;
      record.usuarioId = usuarioId;
      record.numeroPedido = null;
      record.fechaPedido = new Date();
      record.estado = 0; // Borrador
      record.subtotal = subtotal;
      record.descuento = 0;
      record.impuesto = impuesto;
      record.total = total;
      record.notas = notas || null;
      record.activo = true;
      record.version = 1;
      record.updatedAt = new Date();
    });

    for (const item of items) {
      const lineSubtotal = item.precioUnitario * item.cantidad;
      await database.get<DetallePedido>('detalle_pedidos').create((record: any) => {
        record.serverId = null;
        record.pedidoId = pedido.id;
        record.productoId = item.productoId;
        record.productoServerId = item.productoServerId;
        record.productoNombre = item.productoNombre;
        record.cantidad = item.cantidad;
        record.precioUnitario = item.precioUnitario;
        record.descuento = 0;
        record.subtotal = lineSubtotal;
        record.version = 1;
        record.updatedAt = new Date();
      });
    }

    return pedido;
  });
}

/**
 * Create a cobro offline in WatermelonDB.
 */
export async function createCobroOffline(
  clienteId: string,
  clienteServerId: number | null,
  usuarioId: number,
  monto: number,
  metodoPago: number,
  referencia?: string,
  notas?: string
): Promise<Cobro> {
  return database.write(async () => {
    return database.get<Cobro>('cobros').create((record: any) => {
      record.serverId = null;
      record.clienteId = clienteId;
      record.clienteServerId = clienteServerId;
      record.usuarioId = usuarioId;
      record.monto = monto;
      record.metodoPago = metodoPago;
      record.referencia = referencia || null;
      record.notas = notas || null;
      record.activo = true;
      record.version = 1;
      record.updatedAt = new Date();
    });
  });
}

/**
 * Create a visita (check-in) offline in WatermelonDB.
 */
export async function createVisitaOffline(
  clienteId: string,
  clienteServerId: number | null,
  usuarioId: number,
  latitud: number,
  longitud: number,
  distancia: number,
  rutaId?: string
): Promise<Visita> {
  return database.write(async () => {
    return database.get<Visita>('visitas').create((record: any) => {
      record.serverId = null;
      record.clienteId = clienteId;
      record.clienteServerId = clienteServerId;
      record.usuarioId = usuarioId;
      record.rutaId = rutaId || null;
      record.tipo = 0; // Normal
      record.resultado = 1; // EnProgreso
      record.checkInAt = new Date();
      record.checkOutAt = null;
      record.latitudCheckIn = latitud;
      record.longitudCheckIn = longitud;
      record.distanciaCheckIn = distancia;
      record.notas = null;
      record.activo = true;
      record.version = 1;
      record.updatedAt = new Date();
    });
  });
}

/**
 * Check-out a visita offline. Uses WDB writer on the model.
 */
export async function updateVisitaCheckout(
  visitaId: string,
  resultado: number,
  notas?: string
): Promise<void> {
  const visita = await database.get<Visita>('visitas').find(visitaId);
  await visita.checkOut(resultado, notas);
}
