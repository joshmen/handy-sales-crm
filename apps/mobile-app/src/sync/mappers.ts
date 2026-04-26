import type { SyncDatabaseChangeSet } from '@nozbe/watermelondb/sync';
import type { DirtyRaw } from '@nozbe/watermelondb/RawRecord';
import { Q } from '@nozbe/watermelondb';
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
  preciosPorProducto?: any[];
  descuentos?: any[];
  promociones?: any[];
}

// Build a map of server_id → local WDB id for deduplication.
// Indexes by server_id AND by numeric WDB id (for records already pulled from server).
// This handles both cases:
//   A) Record created locally, pushed, got server_id mapping → map by server_id
//   B) Record pulled from server (WDB id = String(server_id)) → map by parsing WDB id
//
// Optimización (2026-04-26): usa `unsafeFetchRaw()` en vez de `fetch()`. Las raw
// rows pesan ~10x menos que los Model objects (sin observables ni proxy de WDB),
// reduciendo memoria de ~5MB a ~500KB para tenants con 10k clientes/productos.
// Solo necesitamos `id` y `server_id` aquí, así que el overhead de Models era puro
// desperdicio. fetchIds() solo retorna ids string sin server_id, no sirve aquí.
async function buildServerIdMap(table: string): Promise<Map<number, string>> {
  const rows = await database.get(table).query().unsafeFetchRaw();
  const map = new Map<number, string>();
  for (const row of rows as { id: string; server_id?: number | string | null }[]) {
    const sid = row.server_id;
    if (sid != null && sid !== '') {
      map.set(Number(sid), row.id);
    } else {
      // For records without server_id, check if WDB id is a numeric string
      // (meaning it was already pulled from server in a previous sync)
      const numId = Number(row.id);
      if (!isNaN(numId) && numId > 0) map.set(numId, row.id);
    }
  }
  return map;
}

export async function mapPullToWatermelon(
  server: ServerChanges,
  lastPulledAt: number | null
): Promise<SyncDatabaseChangeSet> {
  const isFirstSync = !lastPulledAt;

  // Pre-load lookup maps for entities created locally (prevents duplicates on pull).
  // Paralelizar las 7 fetches — cada una es bloqueante pero independiente.
  // Antes corrían secuencialmente sumando 2-5s; ahora corren simultáneas.
  const [
    pedidoMap,
    detalleMap,
    cobroMap,
    visitaMap,
    clienteMap,
    rutaMap,
    rutaDetalleMap,
  ] = await Promise.all([
    buildServerIdMap('pedidos'),
    buildServerIdMap('detalle_pedidos'),
    buildServerIdMap('cobros'),
    buildServerIdMap('visitas'),
    buildServerIdMap('clientes'),
    buildServerIdMap('rutas'),
    buildServerIdMap('ruta_detalles'),
  ]);

  return {
    clientes: splitByOperation(server.clientes, isFirstSync, (c) => mapClienteToRaw(c, clienteMap), clienteMap),
    productos: splitByOperation(server.productos, isFirstSync, mapProductoToRaw),
    pedidos: splitByOperation(server.pedidos, isFirstSync, (p) => mapPedidoToRaw(p, pedidoMap, clienteMap), pedidoMap),
    detalle_pedidos: extractDetallesPedido(server.pedidos, isFirstSync, detalleMap, pedidoMap),
    rutas: splitByOperation(server.rutas, isFirstSync, (r) => mapRutaToRaw(r, rutaMap), rutaMap),
    ruta_detalles: extractDetallesRuta(server.rutas, isFirstSync, rutaDetalleMap, rutaMap, clienteMap, pedidoMap),
    visitas: splitByOperation(server.visitas, isFirstSync, (v) => mapVisitaToRaw(v, visitaMap, clienteMap), visitaMap),
    cobros: splitByOperation(server.cobros, isFirstSync, (c) => mapCobroToRaw(c, cobroMap, clienteMap, pedidoMap), cobroMap),
    precios_por_producto: splitByOperation(server.preciosPorProducto, isFirstSync, mapPrecioPorProductoToRaw),
    descuentos: splitByOperation(server.descuentos, isFirstSync, mapDescuentoToRaw),
    promociones: splitByOperation(server.promociones, isFirstSync, mapPromocionToRaw),
    attachments: { created: [], updated: [], deleted: [] },
  };
}

function splitByOperation(
  items: any[] | undefined,
  _isFirstSync: boolean,
  mapper: (item: any) => DirtyRaw,
  serverMap?: Map<number, string>
): { created: DirtyRaw[]; updated: DirtyRaw[]; deleted: string[] } {
  if (!items?.length) return { created: [], updated: [], deleted: [] };

  const updated: DirtyRaw[] = [];
  const deleted: string[] = [];

  for (const item of items) {
    if (item.isDeleted || item.operation === 2) {
      // Resolve server ID → local WDB ID for correct deletion
      deleted.push(serverMap?.get(item.id) || String(item.id));
    } else {
      // All records go as 'updated' — sendCreatedAsUpdated: true
      // WDB creates records that don't exist locally, updates those that do
      updated.push(mapper(item));
    }
  }

  return { created: [], updated, deleted };
}

// ── Entity Mappers (server DTO → WatermelonDB raw) ──

function mapClienteToRaw(c: any, clienteMap: Map<number, string>): DirtyRaw {
  return {
    // Prefer mapping by server_id; fall back to localId echoed by server (for offline-created
    // records that just got their backend id) before treating as a brand new record.
    id: clienteMap.get(c.id) || (c.localId ? String(c.localId) : String(c.id)),
    server_id: c.id,
    nombre: c.nombre || '',
    nombre_comercial: c.nombreComercial ?? null,
    rfc: c.rfc ?? null,
    telefono: c.telefono ?? null,
    email: c.correo ?? null,
    direccion: c.direccion ?? null,
    numero_exterior: c.numeroExterior ?? null,
    colonia: c.colonia ?? null,
    ciudad: c.ciudad ?? null,
    estado: null,
    codigo_postal: c.codigoPostal ?? null,
    encargado: c.encargado ?? null,
    latitud: c.latitud ?? null,
    longitud: c.longitud ?? null,
    zona_id: c.idZona ?? null,
    categoria_id: c.categoriaClienteId ?? null,
    vendedor_id: c.vendedorId ?? null,
    limite_credito: c.limiteCredito ?? 0,
    dias_credito: c.diasCredito ?? 0,
    descuento: c.descuento ?? 0,
    saldo: c.saldo ?? 0,
    venta_minima_efectiva: c.ventaMinimaEfectiva ?? 0,
    tipos_pago_permitidos: c.tiposPagoPermitidos ?? 'efectivo',
    tipo_pago_predeterminado: c.tipoPagoPredeterminado ?? 'efectivo',
    notas: c.comentarios ?? null,
    lista_precios_id: c.listaPreciosId ?? null,
    es_prospecto: c.esProspecto ?? false,
    rfc_fiscal: c.rfcFiscal ?? null,
    razon_social: c.razonSocial ?? null,
    regimen_fiscal: c.regimenFiscal ?? null,
    uso_cfdi: c.usoCfdiPredeterminado ?? c.usoCfdi ?? null,
    cp_fiscal: c.codigoPostalFiscal ?? c.cpFiscal ?? null,
    requiere_factura: c.requiereFactura ?? false,
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
    stock_disponible: p.stockDisponible ?? 0,
    stock_minimo: p.stockMinimo ?? 0,
    imagen_url: p.imagenUrl ?? null,
    activo: p.activo ?? true,
    version: p.version ?? 1,
    created_at: toTimestamp(p.actualizadoEn),
    updated_at: toTimestamp(p.actualizadoEn),
  };
}

function mapPedidoToRaw(p: any, pedidoMap: Map<number, string>, clienteMap: Map<number, string>): DirtyRaw {
  return {
    // Use mobile_record_id (original WDB id) if available — prevents duplicates
    id: p.localId || pedidoMap.get(p.id) || String(p.id),
    server_id: p.id,
    cliente_id: clienteMap.get(p.clienteId) || String(p.clienteId),
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
    // created_at = fechaPedido (when the order was created), NOT actualizadoEn
    // (which is updated on every state change). El filter "Pedidos hoy" cuenta
    // pedidos creados hoy y se rompía cuando un pedido viejo se actualizaba —
    // todos los pedidos actualizados hoy aparecían como "creados hoy".
    created_at: toTimestamp(p.fechaPedido),
    updated_at: toTimestamp(p.actualizadoEn),
  };
}

function extractDetallesPedido(
  pedidos: any[] | undefined,
  isFirstSync: boolean,
  detalleMap: Map<number, string>,
  pedidoMap: Map<number, string>
): { created: DirtyRaw[]; updated: DirtyRaw[]; deleted: string[] } {
  if (!pedidos?.length) return { created: [], updated: [], deleted: [] };

  const created: DirtyRaw[] = [];
  const updated: DirtyRaw[] = [];

  for (const pedido of pedidos) {
    if (pedido.isDeleted || pedido.operation === 2) continue;
    if (!pedido.detalles?.length) continue;

    for (const d of pedido.detalles) {
      const raw: DirtyRaw = {
        // Prefer mobile_record_id (server echoes LocalId) to dedupe against
        // locally-created offline record that was already pushed in a prior sync.
        id: d.localId || detalleMap.get(d.id) || String(d.id),
        server_id: d.id,
        pedido_id: pedido.localId || pedidoMap.get(pedido.id) || String(pedido.id),
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

function mapRutaToRaw(r: any, rutaMap: Map<number, string>): DirtyRaw {
  return {
    id: rutaMap.get(r.id) || String(r.id),
    server_id: r.id,
    nombre: r.nombre || '',
    fecha: toTimestamp(r.fecha),
    usuario_id: r.usuarioId ?? 0,
    estado: r.estado ?? 0,
    km_recorridos: r.kilometrosReales ?? null,
    hora_inicio: toNullableTimestamp(r.horaInicioReal),
    hora_fin: toNullableTimestamp(r.horaFinReal),
    hora_inicio_estimada: r.horaInicioEstimada ?? null,
    hora_fin_estimada: r.horaFinEstimada ?? null,
    notas: r.notas ?? null,
    activo: r.activo ?? true,
    version: r.version ?? 1,
    created_at: toTimestamp(r.actualizadoEn),
    updated_at: toTimestamp(r.actualizadoEn),
  };
}

function extractDetallesRuta(
  rutas: any[] | undefined,
  isFirstSync: boolean,
  rutaDetalleMap: Map<number, string>,
  rutaMap: Map<number, string>,
  clienteMap: Map<number, string>,
  pedidoMap: Map<number, string>
): { created: DirtyRaw[]; updated: DirtyRaw[]; deleted: string[] } {
  if (!rutas?.length) return { created: [], updated: [], deleted: [] };

  const created: DirtyRaw[] = [];
  const updated: DirtyRaw[] = [];

  for (const ruta of rutas) {
    if (ruta.isDeleted || ruta.operation === 2) continue;
    if (!ruta.detalles?.length) continue;

    for (const d of ruta.detalles) {
      const raw: DirtyRaw = {
        id: rutaDetalleMap.get(d.id) || String(d.id),
        server_id: d.id,
        ruta_id: rutaMap.get(ruta.id) || String(ruta.id),
        cliente_id: clienteMap.get(d.clienteId) || String(d.clienteId),
        cliente_server_id: d.clienteId,
        orden: d.ordenVisita ?? 0,
        pedido_id: d.pedidoId ? (pedidoMap.get(d.pedidoId) || String(d.pedidoId)) : null,
        estado: d.estado ?? 0,
        hora_llegada: toNullableTimestamp(d.horaLlegadaReal),
        hora_salida: toNullableTimestamp(d.horaSalidaReal),
        latitud_llegada: d.latitudLlegada ?? null,
        longitud_llegada: d.longitudLlegada ?? null,
        notas: d.notas ?? null,
        version: d.version ?? 1,
        created_at: toTimestamp(ruta.actualizadoEn),
        updated_at: toTimestamp(ruta.actualizadoEn),
      };

      // All as 'updated' — sendCreatedAsUpdated: true handles creation
      updated.push(raw);
    }
  }

  return { created, updated, deleted: [] };
}

function mapVisitaToRaw(v: any, visitaMap: Map<number, string>, clienteMap: Map<number, string>): DirtyRaw {
  return {
    id: visitaMap.get(v.id) || String(v.id),
    server_id: v.id,
    cliente_id: clienteMap.get(v.clienteId) || String(v.clienteId),
    cliente_server_id: v.clienteId,
    usuario_id: 0,
    ruta_id: null,
    tipo: 0,
    resultado: v.estado ?? 0,
    check_in_at: toNullableTimestamp(v.fechaHoraInicio),
    check_out_at: toNullableTimestamp(v.fechaHoraFin),
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

function mapCobroToRaw(c: any, cobroMap: Map<number, string>, clienteMap: Map<number, string>, pedidoMap: Map<number, string>): DirtyRaw {
  return {
    // Prefer mobile_record_id (server echoes LocalId) to dedupe against
    // locally-created offline record that was already pushed in a prior sync.
    id: c.localId || cobroMap.get(c.id) || String(c.id),
    server_id: c.id,
    cliente_id: clienteMap.get(c.clienteId) || String(c.clienteId),
    cliente_server_id: c.clienteId,
    usuario_id: 0,
    pedido_id: c.pedidoId ? (pedidoMap.get(c.pedidoId) || String(c.pedidoId)) : null,
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

// ── Pricing catalog mappers (read-only) ──

function mapPrecioPorProductoToRaw(p: any): DirtyRaw {
  return {
    id: String(p.id),
    server_id: p.id,
    producto_server_id: p.productoId ?? 0,
    lista_precio_id: p.listaPrecioId ?? 0,
    precio: p.precio ?? 0,
    activo: p.activo ?? true,
    version: 1,
    created_at: toTimestamp(p.actualizadoEn),
    updated_at: toTimestamp(p.actualizadoEn),
  };
}

function mapDescuentoToRaw(d: any): DirtyRaw {
  return {
    id: String(d.id),
    server_id: d.id,
    producto_server_id: d.productoId ?? null,
    cantidad_minima: d.cantidadMinima ?? 0,
    descuento_porcentaje: d.descuentoPorcentaje ?? 0,
    tipo_aplicacion: d.tipoAplicacion || 'Global',
    activo: d.activo ?? true,
    version: 1,
    created_at: toTimestamp(d.actualizadoEn),
    updated_at: toTimestamp(d.actualizadoEn),
  };
}

function mapPromocionToRaw(p: any): DirtyRaw {
  return {
    id: String(p.id),
    server_id: p.id,
    nombre: p.nombre || '',
    descuento_porcentaje: p.descuentoPorcentaje ?? 0,
    fecha_inicio: toTimestamp(p.fechaInicio),
    fecha_fin: toTimestamp(p.fechaFin),
    producto_ids: JSON.stringify(p.productoIds || []),
    activo: p.activo ?? true,
    version: 1,
    created_at: toTimestamp(p.actualizadoEn),
    updated_at: toTimestamp(p.actualizadoEn),
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
      const cantidad = detalle.cantidad ?? 0;
      const precioUnitario = detalle.precio_unitario ?? 0;
      const descuento = detalle.descuento ?? 0;
      const baseLinea = precioUnitario * cantidad;
      // Derive porcentaje from monto: descuento / (precio × cantidad) × 100, two decimals
      const porcentajeDescuento = baseLinea > 0 && descuento > 0
        ? Math.round((descuento / baseLinea) * 10000) / 100
        : 0;
      pedido.detalles.push({
        id: detalle.server_id ?? 0,
        localId: detalle.id,
        productoId: detalle.producto_server_id ?? (parseInt(String(detalle.producto_id), 10) || 0),
        cantidad,
        precioUnitario,
        descuento,
        porcentajeDescuento,
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
    // Dirección desglosada (Cliente field gap fix — antes se perdían en push)
    numeroExterior: raw.numero_exterior ?? null,
    colonia: raw.colonia ?? null,
    ciudad: raw.ciudad ?? null,
    codigoPostal: raw.codigo_postal ?? null,
    encargado: raw.encargado ?? null,
    idZona: raw.zona_id ?? 0,
    categoriaClienteId: raw.categoria_id ?? 0,
    listaPreciosId: raw.lista_precios_id ?? null,
    latitud: raw.latitud,
    longitud: raw.longitud,
    // Comerciales
    limiteCredito: raw.limite_credito ?? 0,
    diasCredito: raw.dias_credito ?? 0,
    descuento: raw.descuento ?? 0,
    saldo: raw.saldo ?? 0,
    ventaMinimaEfectiva: raw.venta_minima_efectiva ?? 0,
    // Reglas de pago
    tiposPagoPermitidos: raw.tipos_pago_permitidos ?? 'efectivo',
    tipoPagoPredeterminado: raw.tipo_pago_predeterminado ?? 'efectivo',
    esProspecto: raw.es_prospecto ?? false,
    comentarios: raw.notas ?? null,
    // Datos fiscales
    rfcFiscal: raw.rfc_fiscal ?? '',
    razonSocial: raw.razon_social ?? '',
    regimenFiscal: raw.regimen_fiscal ?? '',
    usoCfdi: raw.uso_cfdi ?? '',
    cpFiscal: raw.cp_fiscal ?? '',
    requiereFactura: raw.requiere_factura ?? false,
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
    // pedidoId: preferir pedido_server_id (si ya sincronizado) sobre parseInt del WDB id.
    // Si el pedido fue creado offline y NO tiene server_id aún, mandar pedidoLocalId
    // para que el server lo resuelva via MobileRecordId (evita cobros huérfanos en VD).
    pedidoId: raw.pedido_server_id
      ? Number(raw.pedido_server_id)
      : (raw.pedido_id && /^\d+$/.test(String(raw.pedido_id))
          ? parseInt(String(raw.pedido_id), 10)
          : null),
    pedidoLocalId: raw.pedido_id && !/^\d+$/.test(String(raw.pedido_id))
      ? String(raw.pedido_id)
      : null,
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

/**
 * Usado para campos que SIEMPRE deben tener valor (created_at, updated_at).
 * Si el backend no envía, cae a Date.now() como último recurso.
 */
function toTimestamp(dateStr: string | null | undefined): number {
  if (!dateStr) return Date.now();
  const ms = new Date(dateStr).getTime();
  return isNaN(ms) ? Date.now() : ms;
}

/**
 * Usado para campos timestamp opcionales (hora_llegada, hora_salida,
 * aceptada_en, etc). Preserva null — crítico para que `displayEstado` no
 * infiera "Completada" cuando el backend dijo que aún no hay hora_salida.
 */
function toNullableTimestamp(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const ms = new Date(dateStr).getTime();
  return isNaN(ms) ? null : ms;
}
