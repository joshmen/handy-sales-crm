import type { SyncDatabaseChangeSet } from '@nozbe/watermelondb/sync';
import type { DirtyRaw } from '@nozbe/watermelondb/RawRecord';
import { database } from '@/db/database';

// ────────────────────────────────────────────────────────────────
// PULL: Server → WatermelonDB
// Backend returns flat arrays per entity. WatermelonDB needs
// { table: { created: [], updated: [], deleted: [] } }
// ────────────────────────────────────────────────────────────────

interface ServerChanges {
  clientes?: any[];
  productos?: any[];
  pedidos?: any[];
  visitas?: any[];
  rutas?: any[];
  cobros?: any[];
}

export function mapPullToWatermelon(
  server: ServerChanges,
  lastPulledAt: number | null
): SyncDatabaseChangeSet {
  const isFirstSync = !lastPulledAt;

  return {
    clientes: splitByOperation(server.clientes, isFirstSync, mapClienteToRaw),
    productos: splitByOperation(server.productos, isFirstSync, mapProductoToRaw),
    pedidos: splitByOperation(server.pedidos, isFirstSync, mapPedidoToRaw),
    detalle_pedidos: extractDetallesPedido(server.pedidos, isFirstSync),
    rutas: splitByOperation(server.rutas, isFirstSync, mapRutaToRaw),
    ruta_detalles: extractDetallesRuta(server.rutas, isFirstSync),
    visitas: splitByOperation(server.visitas, isFirstSync, mapVisitaToRaw),
    cobros: splitByOperation(server.cobros, isFirstSync, mapCobroToRaw),
    attachments: { created: [], updated: [], deleted: [] },
  };
}

function splitByOperation(
  items: any[] | undefined,
  _isFirstSync: boolean,
  mapper: (item: any) => DirtyRaw
): { created: DirtyRaw[]; updated: DirtyRaw[]; deleted: string[] } {
  if (!items?.length) return { created: [], updated: [], deleted: [] };

  const updated: DirtyRaw[] = [];
  const deleted: string[] = [];

  for (const item of items) {
    if (item.isDeleted || item.operation === 2) {
      deleted.push(String(item.id));
    } else {
      // All records go as 'updated' — sendCreatedAsUpdated: true
      // WDB creates records that don't exist locally, updates those that do
      updated.push(mapper(item));
    }
  }

  return { created: [], updated, deleted };
}

// ── Entity Mappers (server DTO → WatermelonDB raw) ──

function mapClienteToRaw(c: any): DirtyRaw {
  return {
    id: String(c.id),
    server_id: c.id,
    nombre: c.nombre || '',
    nombre_comercial: c.nombreComercial ?? null,
    rfc: c.rfc ?? null,
    telefono: c.telefono ?? null,
    email: c.correo ?? null,
    direccion: c.direccion ?? null,
    ciudad: null,
    estado: null,
    codigo_postal: null,
    latitud: c.latitud ?? null,
    longitud: c.longitud ?? null,
    zona_id: c.idZona ?? null,
    categoria_id: c.categoriaClienteId ?? null,
    vendedor_id: null,
    limite_credito: c.limiteCredito ?? 0,
    dias_credito: c.diasCredito ?? 0,
    notas: null,
    es_prospecto: c.esProspecto ?? false,
    activo: c.activo ?? true,
    version: c.version ?? 1,
    created_at: toTimestamp(c.actualizadoEn),
    updated_at: toTimestamp(c.actualizadoEn),
  };
}

function mapProductoToRaw(p: any): DirtyRaw {
  return {
    id: String(p.id),
    server_id: p.id,
    nombre: p.nombre || '',
    descripcion: p.descripcion ?? null,
    sku: p.sku ?? null,
    codigo_barras: null,
    precio: p.precio ?? 0,
    categoria_id: p.categoriaProductoId ?? null,
    familia_id: p.familiaProductoId ?? null,
    unidad_medida_id: p.unidadMedidaId ?? null,
    unidad_medida_nombre: null,
    stock_disponible: 0,
    stock_minimo: 0,
    imagen_url: p.imagenUrl ?? null,
    activo: p.activo ?? true,
    version: p.version ?? 1,
    created_at: toTimestamp(p.actualizadoEn),
    updated_at: toTimestamp(p.actualizadoEn),
  };
}

function mapPedidoToRaw(p: any): DirtyRaw {
  return {
    id: String(p.id),
    server_id: p.id,
    cliente_id: String(p.clienteId),
    cliente_server_id: p.clienteId,
    usuario_id: 0,
    numero_pedido: p.numeroPedido ?? null,
    fecha_pedido: toTimestamp(p.fechaPedido),
    estado: p.estado ?? 0,
    tipo_venta: p.tipoVenta ?? 0,
    subtotal: p.subtotal ?? 0,
    descuento: p.descuento ?? 0,
    impuesto: p.impuestos ?? 0,
    total: p.total ?? 0,
    notas: p.notas ?? null,
    activo: p.activo ?? true,
    version: p.version ?? 1,
    created_at: toTimestamp(p.actualizadoEn),
    updated_at: toTimestamp(p.actualizadoEn),
  };
}

function extractDetallesPedido(
  pedidos: any[] | undefined,
  isFirstSync: boolean
): { created: DirtyRaw[]; updated: DirtyRaw[]; deleted: string[] } {
  if (!pedidos?.length) return { created: [], updated: [], deleted: [] };

  const created: DirtyRaw[] = [];
  const updated: DirtyRaw[] = [];

  for (const pedido of pedidos) {
    if (pedido.isDeleted || pedido.operation === 2) continue;
    if (!pedido.detalles?.length) continue;

    for (const d of pedido.detalles) {
      const raw: DirtyRaw = {
        id: String(d.id),
        server_id: d.id,
        pedido_id: String(pedido.id),
        producto_id: String(d.productoId),
        producto_server_id: d.productoId,
        producto_nombre: d.nombre ?? '',
        cantidad: d.cantidad ?? 0,
        precio_unitario: d.precioUnitario ?? 0,
        descuento: d.descuento ?? 0,
        subtotal: d.subtotal ?? 0,
        version: d.version ?? 1,
        created_at: toTimestamp(pedido.actualizadoEn),
        updated_at: toTimestamp(pedido.actualizadoEn),
      };

      // All as 'updated' — sendCreatedAsUpdated: true handles creation
      updated.push(raw);
    }
  }

  return { created, updated, deleted: [] };
}

function mapRutaToRaw(r: any): DirtyRaw {
  return {
    id: String(r.id),
    server_id: r.id,
    nombre: r.nombre || '',
    fecha: toTimestamp(r.fecha),
    usuario_id: r.usuarioId ?? 0,
    estado: r.estado ?? 0,
    km_recorridos: r.kilometrosReales ?? null,
    hora_inicio: toTimestamp(r.horaInicioReal),
    hora_fin: toTimestamp(r.horaFinReal),
    notas: r.notas ?? null,
    activo: r.activo ?? true,
    version: r.version ?? 1,
    created_at: toTimestamp(r.actualizadoEn),
    updated_at: toTimestamp(r.actualizadoEn),
  };
}

function extractDetallesRuta(
  rutas: any[] | undefined,
  isFirstSync: boolean
): { created: DirtyRaw[]; updated: DirtyRaw[]; deleted: string[] } {
  if (!rutas?.length) return { created: [], updated: [], deleted: [] };

  const created: DirtyRaw[] = [];
  const updated: DirtyRaw[] = [];

  for (const ruta of rutas) {
    if (ruta.isDeleted || ruta.operation === 2) continue;
    if (!ruta.detalles?.length) continue;

    for (const d of ruta.detalles) {
      const raw: DirtyRaw = {
        id: String(d.id),
        server_id: d.id,
        ruta_id: String(ruta.id),
        cliente_id: String(d.clienteId),
        cliente_server_id: d.clienteId,
        orden: d.ordenVisita ?? 0,
        pedido_id: d.pedidoId ? String(d.pedidoId) : null,
        estado: d.estado ?? 0,
        hora_llegada: toTimestamp(d.horaLlegadaReal),
        hora_salida: toTimestamp(d.horaSalidaReal),
        latitud_llegada: d.latitudLlegada ?? null,
        longitud_llegada: d.longitudLlegada ?? null,
        notas: d.notas ?? null,
        version: d.version ?? 1,
        created_at: toTimestamp(ruta.actualizadoEn),
        updated_at: toTimestamp(ruta.actualizadoEn),
      };

      if (isFirstSync) {
        // All as 'updated' — sendCreatedAsUpdated: true handles creation
        updated.push(raw);
      }
      // Delta sync: skip — mobile push handles updating the server
    }
  }

  return { created, updated, deleted: [] };
}

function mapVisitaToRaw(v: any): DirtyRaw {
  return {
    id: String(v.id),
    server_id: v.id,
    cliente_id: String(v.clienteId),
    cliente_server_id: v.clienteId,
    usuario_id: 0,
    ruta_id: null,
    tipo: 0,
    resultado: v.estado ?? 0,
    check_in_at: toTimestamp(v.fechaHoraInicio),
    check_out_at: toTimestamp(v.fechaHoraFin),
    latitud_check_in: v.latitudInicio ?? null,
    longitud_check_in: v.longitudInicio ?? null,
    distancia_check_in: null,
    notas: v.notas ?? null,
    activo: v.activo ?? true,
    version: v.version ?? 1,
    created_at: toTimestamp(v.actualizadoEn),
    updated_at: toTimestamp(v.actualizadoEn),
  };
}

function mapCobroToRaw(c: any): DirtyRaw {
  return {
    id: String(c.id),
    server_id: c.id,
    cliente_id: String(c.clienteId),
    cliente_server_id: c.clienteId,
    usuario_id: 0,
    pedido_id: c.pedidoId ? String(c.pedidoId) : null,
    monto: c.monto ?? 0,
    metodo_pago: c.metodoPago ?? 0,
    referencia: c.referencia ?? null,
    notas: c.notas ?? null,
    activo: c.activo ?? true,
    version: c.version ?? 1,
    created_at: toTimestamp(c.fechaCobro ?? c.actualizadoEn),
    updated_at: toTimestamp(c.actualizadoEn),
  };
}

// ────────────────────────────────────────────────────────────────
// PUSH: WatermelonDB → Server
// WatermelonDB gives us { table: { created: [], updated: [], deleted: [] } }
// Backend expects { clientes: [], pedidos: [], visitas: [], cobros: [] }
// with Operation enum per record (0=Create, 1=Update, 2=Delete)
// ────────────────────────────────────────────────────────────────

export async function mapPushFromWatermelon(changes: SyncDatabaseChangeSet): Promise<any> {
  const c = (changes as any).clientes;
  const p = (changes as any).pedidos;
  const dp = (changes as any).detalle_pedidos;
  const v = (changes as any).visitas;
  const co = (changes as any).cobros;
  const r = (changes as any).rutas;
  const rd = (changes as any).ruta_detalles;

  // Build pedidos with their detalles included
  const pedidos = [
    ...mapPushEntities(p?.created, 0, rawToPedidoDto),
    ...mapPushEntities(p?.updated, 1, rawToPedidoDto),
    ...mapDeleteIds(p?.deleted),
  ];

  // Attach detalles to their respective pedidos
  const allDetalles = [
    ...(dp?.created ?? []),
    ...(dp?.updated ?? []),
  ];
  for (const detalle of allDetalles) {
    const pedido = pedidos.find(
      (ped: any) => ped.localId === detalle.pedido_id || String(ped.id) === detalle.pedido_id
    );
    if (pedido && !pedido.isDeleted) {
      pedido.detalles.push({
        id: detalle.server_id ?? 0,
        localId: detalle.id,
        productoId: detalle.producto_server_id ?? (parseInt(String(detalle.producto_id), 10) || 0),
        cantidad: detalle.cantidad ?? 0,
        precioUnitario: detalle.precio_unitario ?? 0,
        descuento: detalle.descuento ?? 0,
        porcentajeDescuento: 0,
        subtotal: detalle.subtotal ?? 0,
        impuesto: (detalle.subtotal ?? 0) * 0.16,
        total: (detalle.subtotal ?? 0) * 1.16,
        version: detalle.version ?? 1,
      });
    }
  }

  return {
    clientes: [
      ...mapPushEntities(c?.created, 0, rawToClienteDto),
      ...mapPushEntities(c?.updated, 1, rawToClienteDto),
      ...mapDeleteIds(c?.deleted),
    ],
    pedidos,
    visitas: [
      ...mapPushEntities(v?.created, 0, rawToVisitaDto),
      ...mapPushEntities(v?.updated, 1, rawToVisitaDto),
      ...mapDeleteIds(v?.deleted),
    ],
    cobros: [
      ...mapPushEntities(co?.created, 0, rawToCobroDto),
      ...mapPushEntities(co?.updated, 1, rawToCobroDto),
      ...mapDeleteIds(co?.deleted),
    ],
    rutas: [
      ...mapPushEntities(r?.updated, 1, rawToRutaDto),
    ],
    rutaDetalles: [
      ...mapPushEntities(rd?.updated, 1, rawToRutaDetalleDto),
    ],
  };
}

function mapPushEntities(
  items: DirtyRaw[] | undefined,
  operation: number,
  mapper: (raw: DirtyRaw, op: number) => any
): any[] {
  if (!items?.length) return [];
  return items.map((raw) => mapper(raw, operation));
}

function mapDeleteIds(ids: string[] | undefined): any[] {
  if (!ids?.length) return [];
  return ids.map((id) => ({
    id: parseInt(id, 10) || 0,
    operation: 2, // Delete
    isDeleted: true,
  }));
}

function rawToClienteDto(raw: DirtyRaw, operation: number): any {
  return {
    id: raw.server_id ?? 0,
    localId: raw.id,
    nombre: raw.nombre,
    rfc: raw.rfc ?? '',
    correo: raw.email ?? '',
    telefono: raw.telefono ?? '',
    direccion: raw.direccion ?? '',
    idZona: raw.zona_id ?? 0,
    categoriaClienteId: raw.categoria_id ?? 0,
    latitud: raw.latitud,
    longitud: raw.longitud,
    activo: raw.activo ?? true,
    version: raw.version ?? 1,
    operation,
  };
}

function rawToPedidoDto(raw: DirtyRaw, operation: number): any {
  return {
    id: raw.server_id ?? 0,
    localId: raw.id,
    clienteId: raw.cliente_server_id ?? (parseInt(String(raw.cliente_id), 10) || 0),
    fechaPedido: new Date(raw.created_at).toISOString(),
    estado: raw.estado ?? 0,
    tipoVenta: raw.tipo_venta ?? 0,
    subtotal: raw.subtotal ?? 0,
    impuestos: raw.impuesto ?? 0,
    total: raw.total ?? 0,
    notas: raw.notas,
    activo: raw.activo ?? true,
    version: raw.version ?? 1,
    operation,
    detalles: [],
  };
}

function rawToVisitaDto(raw: DirtyRaw, operation: number): any {
  return {
    id: raw.server_id ?? 0,
    localId: raw.id,
    clienteId: raw.cliente_server_id ?? (parseInt(String(raw.cliente_id), 10) || 0),
    fechaHoraInicio: raw.check_in_at ? new Date(raw.check_in_at).toISOString() : null,
    fechaHoraFin: raw.check_out_at ? new Date(raw.check_out_at).toISOString() : null,
    latitudInicio: raw.latitud_check_in,
    longitudInicio: raw.longitud_check_in,
    estado: raw.resultado ?? 0,
    notas: raw.notas,
    activo: raw.activo ?? true,
    version: raw.version ?? 1,
    operation,
  };
}

function rawToRutaDto(raw: DirtyRaw, operation: number): any {
  return {
    id: raw.server_id ?? 0,
    localId: raw.id,
    nombre: raw.nombre ?? '',
    fecha: raw.fecha ? new Date(raw.fecha).toISOString() : new Date().toISOString(),
    estado: raw.estado ?? 0,
    horaInicioReal: raw.hora_inicio ? new Date(raw.hora_inicio).toISOString() : null,
    horaFinReal: raw.hora_fin ? new Date(raw.hora_fin).toISOString() : null,
    kilometrosReales: raw.km_recorridos ?? null,
    notas: raw.notas,
    activo: raw.activo ?? true,
    version: raw.version ?? 1,
    operation,
  };
}

function rawToRutaDetalleDto(raw: DirtyRaw, operation: number): any {
  console.log('[Sync] rawToRutaDetalleDto — id:', raw.id, 'server_id:', raw.server_id, 'estado:', raw.estado);
  return {
    id: raw.server_id ?? 0,
    localId: raw.id,
    clienteId: raw.cliente_server_id ?? (parseInt(String(raw.cliente_id), 10) || 0),
    ordenVisita: raw.orden ?? 0,
    horaLlegadaReal: raw.hora_llegada ? new Date(raw.hora_llegada).toISOString() : null,
    horaSalidaReal: raw.hora_salida ? new Date(raw.hora_salida).toISOString() : null,
    latitudLlegada: raw.latitud_llegada ?? null,
    longitudLlegada: raw.longitud_llegada ?? null,
    estado: raw.estado ?? 0,
    razonOmision: raw.notas ?? null,
    visitaId: null,
    pedidoId: raw.pedido_id ? (parseInt(String(raw.pedido_id), 10) || null) : null,
    notas: raw.notas,
    version: raw.version ?? 1,
    operation,
  };
}

function rawToCobroDto(raw: DirtyRaw, operation: number): any {
  return {
    id: raw.server_id ?? 0,
    localId: raw.id,
    clienteId: raw.cliente_server_id ?? (parseInt(String(raw.cliente_id), 10) || 0),
    pedidoId: raw.pedido_id ? (parseInt(String(raw.pedido_id), 10) || null) : null,
    monto: raw.monto ?? 0,
    metodoPago: raw.metodo_pago ?? 0,
    fechaCobro: new Date(raw.created_at).toISOString(),
    referencia: raw.referencia,
    notas: raw.notas,
    activo: raw.activo ?? true,
    version: raw.version ?? 1,
    operation,
  };
}

// ── Helpers ──

function toTimestamp(dateStr: string | null | undefined): number {
  if (!dateStr) return Date.now();
  const ms = new Date(dateStr).getTime();
  return isNaN(ms) ? Date.now() : ms;
}
