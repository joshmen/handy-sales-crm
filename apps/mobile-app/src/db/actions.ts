import { database } from './database';
import Pedido from './models/Pedido';
import DetallePedido from './models/DetallePedido';
import Cobro from './models/Cobro';
import Visita from './models/Visita';
import Cliente from './models/Cliente';
import RutaDetalle from './models/RutaDetalle';
import { round2 } from '@/utils/money';

/**
 * Create a cliente offline in WatermelonDB.
 * WDB marks it as `created` — next sync push sends it to server.
 */
export async function createClienteOffline(data: {
  nombre: string;
  telefono?: string;
  correo?: string;
  rfc?: string;
  direccion: string;
  numeroExterior?: string;
  colonia?: string;
  ciudad?: string;
  codigoPostal?: string;
  encargado?: string;
  zonaId: number;
  categoriaId: number;
  latitud?: number;
  longitud?: number;
  // Comerciales
  descuento?: number;
  ventaMinimaEfectiva?: number;
  // Reglas de pago
  tiposPagoPermitidos?: string;
  tipoPagoPredeterminado?: string;
  notas?: string;
  // Fiscales
  rfcFiscal?: string;
  razonSocial?: string;
  regimenFiscal?: string;
  usoCfdi?: string;
  cpFiscal?: string;
  requiereFactura?: boolean;
}): Promise<Cliente> {
  return database.write(async () => {
    return await database.get<Cliente>('clientes').create((record: any) => {
      record.serverId = null;
      record.nombre = data.nombre;
      record.telefono = data.telefono || null;
      record.email = data.correo || null;
      record.rfc = data.rfc || null;
      record.direccion = data.direccion;
      // Dirección desglosada (antes se perdían los campos al guardar)
      record.numeroExterior = data.numeroExterior || null;
      record.colonia = data.colonia || null;
      record.ciudad = data.ciudad || null;
      record.codigoPostal = data.codigoPostal || null;
      record.encargado = data.encargado || null;
      record.zonaId = data.zonaId;
      record.categoriaId = data.categoriaId;
      record.latitud = data.latitud ?? null;
      record.longitud = data.longitud ?? null;
      record.limiteCredito = 0;
      record.diasCredito = 0;
      record.descuento = data.descuento ?? 0;
      record.saldo = 0;
      record.ventaMinimaEfectiva = data.ventaMinimaEfectiva ?? 0;
      record.tiposPagoPermitidos = data.tiposPagoPermitidos ?? 'efectivo';
      record.tipoPagoPredeterminado = data.tipoPagoPredeterminado ?? 'efectivo';
      record.esProspecto = false;
      record.notas = data.notas || null;
      record.rfcFiscal = data.rfcFiscal || null;
      record.razonSocial = data.razonSocial || null;
      record.regimenFiscal = data.regimenFiscal || null;
      record.usoCfdi = data.usoCfdi || null;
      record.cpFiscal = data.cpFiscal || null;
      record.requiereFactura = data.requiereFactura ?? false;
      record.activo = true;
      record.version = 1;
      record.updatedAt = new Date();
    });
  });
}

export interface OfflineOrderItem {
  productoId: string;
  productoServerId: number | null;
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
  descuento?: number;
  porcentajeDescuento?: number;
}

const IVA_RATE = 0.16;

/**
 * Create a pedido + detalles offline in WatermelonDB.
 * WDB marks them as `created` — next sync push sends them to server.
 *
 * Si se pasa `paradaId`, la parada se marca como Completada (estado=2) dentro
 * del mismo `database.write()` para que sea atómico con la creación del pedido.
 */
export async function createPedidoOffline(
  clienteId: string,
  clienteServerId: number | null,
  usuarioId: number,
  items: OfflineOrderItem[],
  notas?: string,
  tipoVenta: number = 0,
  estado: number = 0,
  paradaId?: string | null
): Promise<Pedido> {
  // Redondear cada cantidad monetaria a 2 decimales para evitar drift de float
  // que el backend rechazaría con error "monto no coincide" en el sync push.
  const subtotal = round2(items.reduce((sum, i) => sum + i.precioUnitario * i.cantidad, 0));
  const descuentoTotal = round2(items.reduce((sum, i) => sum + (i.descuento ?? 0), 0));
  const impuesto = round2((subtotal - descuentoTotal) * IVA_RATE);
  const total = round2(subtotal - descuentoTotal + impuesto);

  return database.write(async () => {
    const pedido = await database.get<Pedido>('pedidos').create((record: any) => {
      record.serverId = null;
      record.clienteId = clienteId;
      record.clienteServerId = clienteServerId;
      record.usuarioId = usuarioId;
      record.numeroPedido = null;
      record.fechaPedido = new Date();
      record.estado = estado;
      record.tipoVenta = tipoVenta;
      record.subtotal = subtotal;
      record.descuento = descuentoTotal;
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
        record.descuento = item.descuento ?? 0;
        record.subtotal = lineSubtotal;
        record.version = 1;
        record.updatedAt = new Date();
      });
    }

    if (paradaId) {
      const stopRecord = await database.get<RutaDetalle>('ruta_detalles').find(paradaId);
      await stopRecord.update((record: any) => {
        record.estado = 2; // Completada
        record.horaSalida = new Date();
      });
    }

    return pedido;
  });
}

/**
 * Create a venta directa offline: atomically creates a Pedido (estado=5, tipoVenta=1)
 * + Cobro linked by pedido_id in a single database.write() call.
 *
 * Si se pasa `paradaId`, la parada se marca como completada (estado=2) dentro
 * del MISMO `database.write()` → si cualquier paso falla, nada se persiste.
 * Esto cierra la brecha donde el pedido/cobro quedaba creado pero la parada
 * quedaba colgada "EnVisita" si `stopRecord.depart()` fallaba después.
 */
export async function createVentaDirectaOffline(
  clienteId: string,
  clienteServerId: number | null,
  usuarioId: number,
  items: OfflineOrderItem[],
  metodoPago: number,
  monto: number,
  referencia?: string,
  notas?: string,
  paradaId?: string | null
): Promise<{ pedido: Pedido; cobro: Cobro }> {
  // Redondear cada cantidad monetaria a 2 decimales — ver comentario en createPedidoOffline.
  const subtotal = round2(items.reduce((sum, i) => sum + i.precioUnitario * i.cantidad, 0));
  const descuentoTotal = round2(items.reduce((sum, i) => sum + (i.descuento ?? 0), 0));
  const impuesto = round2((subtotal - descuentoTotal) * IVA_RATE);
  const total = round2(subtotal - descuentoTotal + impuesto);

  return database.write(async () => {
    const pedido = await database.get<Pedido>('pedidos').create((record: any) => {
      record.serverId = null;
      record.clienteId = clienteId;
      record.clienteServerId = clienteServerId;
      record.usuarioId = usuarioId;
      record.numeroPedido = null;
      record.fechaPedido = new Date();
      record.estado = 5; // Entregado
      record.tipoVenta = 1; // VentaDirecta
      record.subtotal = subtotal;
      record.descuento = descuentoTotal;
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
        record.descuento = item.descuento ?? 0;
        record.subtotal = lineSubtotal;
        record.version = 1;
        record.updatedAt = new Date();
      });
    }

    const cobro = await database.get<Cobro>('cobros').create((record: any) => {
      record.serverId = null;
      record.clienteId = clienteId;
      record.clienteServerId = clienteServerId;
      record.usuarioId = usuarioId;
      record.pedidoId = pedido.id;
      record.monto = monto;
      record.metodoPago = metodoPago;
      record.referencia = referencia || null;
      record.notas = notas || null;
      record.activo = true;
      record.version = 1;
      record.updatedAt = new Date();
    });

    // Atomicidad con la parada: si viene de ruta, se marca como Completada
    // en la misma transacción. No usamos el @writer `depart()` porque WDB
    // no permite writes anidados — hacemos update() directo.
    if (paradaId) {
      const stopRecord = await database.get<RutaDetalle>('ruta_detalles').find(paradaId);
      await stopRecord.update((record: any) => {
        record.estado = 2; // Completada
        record.horaSalida = new Date();
      });
    }

    return { pedido, cobro };
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
  notas?: string,
  pedidoId?: string | null
): Promise<Cobro> {
  return database.write(async () => {
    return database.get<Cobro>('cobros').create((record: any) => {
      record.serverId = null;
      record.clienteId = clienteId;
      record.clienteServerId = clienteServerId;
      record.usuarioId = usuarioId;
      record.pedidoId = pedidoId || null;
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
