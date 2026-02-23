import type { SyncDatabaseChangeSet } from '@nozbe/watermelondb/sync';
import type { DirtyRaw } from '@nozbe/watermelondb/RawRecord';

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
    cobros: { created: [], updated: [], deleted: [] },
    attachments: { created: [], updated: [], deleted: [] },
  };
}

function splitByOperation(
  items: any[] | undefined,
  isFirstSync: boolean,
  mapper: (item: any) => DirtyRaw
): { created: DirtyRaw[]; updated: DirtyRaw[]; deleted: string[] } {
  if (!items?.length) return { created: [], updated: [], deleted: [] };

  const created: DirtyRaw[] = [];
  const updated: DirtyRaw[] = [];
  const deleted: string[] = [];

  for (const item of items) {
    if (item.isDeleted || item.operation === 2) {
      // Use server ID as string for deletion
      deleted.push(String(item.id));
    } else if (isFirstSync || item.operation === 0) {
      created.push(mapper(item));
    } else {
      updated.push(mapper(item));
    }
  }

  return { created, updated, deleted };
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
    estado: p.estado ?? 0,
    subtotal: p.subtotal ?? 0,
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

      if (isFirstSync || d.operation === 0) {
        created.push(raw);
      } else {
        updated.push(raw);
      }
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
    usuario_id: 0,
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

      if (isFirstSync || d.operation === 0) {
        created.push(raw);
      } else {
        updated.push(raw);
      }
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

// ────────────────────────────────────────────────────────────────
// PUSH: WatermelonDB → Server
// WatermelonDB gives us { table: { created: [], updated: [], deleted: [] } }
// Backend expects { clientes: [], pedidos: [], visitas: [], rutas: [] }
// with Operation enum per record (0=Create, 1=Update, 2=Delete)
// ────────────────────────────────────────────────────────────────

export function mapPushFromWatermelon(changes: SyncDatabaseChangeSet): any {
  const c = (changes as any).clientes;
  const p = (changes as any).pedidos;
  const v = (changes as any).visitas;

  return {
    clientes: [
      ...mapPushEntities(c?.created, 0, rawToClienteDto),
      ...mapPushEntities(c?.updated, 1, rawToClienteDto),
      ...mapDeleteIds(c?.deleted),
    ],
    pedidos: [
      ...mapPushEntities(p?.created, 0, rawToPedidoDto),
      ...mapPushEntities(p?.updated, 1, rawToPedidoDto),
      ...mapDeleteIds(p?.deleted),
    ],
    visitas: [
      ...mapPushEntities(v?.created, 0, rawToVisitaDto),
      ...mapPushEntities(v?.updated, 1, rawToVisitaDto),
      ...mapDeleteIds(v?.deleted),
    ],
    // Rutas are read-only for vendors (admin-assigned)
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
    estado: raw.estado ?? 0,
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

// ── Helpers ──

function toTimestamp(dateStr: string | null | undefined): number {
  if (!dateStr) return Date.now();
  const ms = new Date(dateStr).getTime();
  return isNaN(ms) ? Date.now() : ms;
}
