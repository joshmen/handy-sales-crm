import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 7,
  tables: [
    // ─── Clientes ──────────────────────────────────────────
    tableSchema({
      name: 'clientes',
      columns: [
        { name: 'server_id', type: 'number', isOptional: true },
        { name: 'nombre', type: 'string' },
        { name: 'nombre_comercial', type: 'string', isOptional: true },
        { name: 'rfc', type: 'string', isOptional: true },
        { name: 'telefono', type: 'string', isOptional: true },
        { name: 'email', type: 'string', isOptional: true },
        { name: 'direccion', type: 'string', isOptional: true },
        { name: 'ciudad', type: 'string', isOptional: true },
        { name: 'estado', type: 'string', isOptional: true },
        { name: 'codigo_postal', type: 'string', isOptional: true },
        { name: 'latitud', type: 'number', isOptional: true },
        { name: 'longitud', type: 'number', isOptional: true },
        { name: 'zona_id', type: 'number', isOptional: true },
        { name: 'categoria_id', type: 'number', isOptional: true },
        { name: 'vendedor_id', type: 'number', isOptional: true },
        { name: 'limite_credito', type: 'number' },
        { name: 'dias_credito', type: 'number' },
        { name: 'notas', type: 'string', isOptional: true },
        { name: 'lista_precios_id', type: 'number', isOptional: true },
        { name: 'es_prospecto', type: 'boolean' },
        { name: 'activo', type: 'boolean' },
        { name: 'version', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ─── Productos (read-only, synced from server) ─────────
    tableSchema({
      name: 'productos',
      columns: [
        { name: 'server_id', type: 'number', isOptional: true },
        { name: 'nombre', type: 'string' },
        { name: 'descripcion', type: 'string', isOptional: true },
        { name: 'sku', type: 'string', isOptional: true },
        { name: 'codigo_barras', type: 'string', isOptional: true },
        { name: 'precio', type: 'number' },
        { name: 'categoria_id', type: 'number', isOptional: true },
        { name: 'familia_id', type: 'number', isOptional: true },
        { name: 'unidad_medida_id', type: 'number', isOptional: true },
        { name: 'unidad_medida_nombre', type: 'string', isOptional: true },
        { name: 'stock_disponible', type: 'number' },
        { name: 'stock_minimo', type: 'number' },
        { name: 'imagen_url', type: 'string', isOptional: true },
        { name: 'activo', type: 'boolean' },
        { name: 'version', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ─── Pedidos ───────────────────────────────────────────
    tableSchema({
      name: 'pedidos',
      columns: [
        { name: 'server_id', type: 'number', isOptional: true },
        { name: 'cliente_id', type: 'string', isIndexed: true },
        { name: 'cliente_server_id', type: 'number', isOptional: true },
        { name: 'usuario_id', type: 'number' },
        { name: 'numero_pedido', type: 'string', isOptional: true },
        { name: 'fecha_pedido', type: 'number', isOptional: true },
        { name: 'estado', type: 'number' }, // 0=Borrador..6=Cancelado
        { name: 'tipo_venta', type: 'number' }, // 0=Preventa, 1=VentaDirecta
        { name: 'subtotal', type: 'number' },
        { name: 'descuento', type: 'number' },
        { name: 'impuesto', type: 'number' },
        { name: 'total', type: 'number' },
        { name: 'notas', type: 'string', isOptional: true },
        { name: 'activo', type: 'boolean' },
        { name: 'version', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ─── Detalle Pedidos ───────────────────────────────────
    tableSchema({
      name: 'detalle_pedidos',
      columns: [
        { name: 'server_id', type: 'number', isOptional: true },
        { name: 'pedido_id', type: 'string', isIndexed: true },
        { name: 'producto_id', type: 'string', isIndexed: true },
        { name: 'producto_server_id', type: 'number', isOptional: true },
        { name: 'producto_nombre', type: 'string' },
        { name: 'cantidad', type: 'number' },
        { name: 'precio_unitario', type: 'number' },
        { name: 'descuento', type: 'number' },
        { name: 'subtotal', type: 'number' },
        { name: 'version', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ─── Rutas ─────────────────────────────────────────────
    tableSchema({
      name: 'rutas',
      columns: [
        { name: 'server_id', type: 'number', isOptional: true },
        { name: 'nombre', type: 'string' },
        { name: 'fecha', type: 'number' },
        { name: 'usuario_id', type: 'number' },
        { name: 'estado', type: 'number' }, // 0=Planificada..3=Cancelada
        { name: 'km_recorridos', type: 'number', isOptional: true },
        { name: 'hora_inicio', type: 'number', isOptional: true },
        { name: 'hora_fin', type: 'number', isOptional: true },
        { name: 'hora_inicio_estimada', type: 'string', isOptional: true },
        { name: 'hora_fin_estimada', type: 'string', isOptional: true },
        { name: 'notas', type: 'string', isOptional: true },
        { name: 'activo', type: 'boolean' },
        { name: 'version', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ─── Ruta Detalles (paradas) ───────────────────────────
    tableSchema({
      name: 'ruta_detalles',
      columns: [
        { name: 'server_id', type: 'number', isOptional: true },
        { name: 'ruta_id', type: 'string', isIndexed: true },
        { name: 'cliente_id', type: 'string', isIndexed: true },
        { name: 'cliente_server_id', type: 'number', isOptional: true },
        { name: 'orden', type: 'number' },
        { name: 'pedido_id', type: 'string', isOptional: true },
        { name: 'estado', type: 'number' }, // 0=Pendiente, 1=EnCamino, 2=Visitado, 3=Omitido
        { name: 'hora_llegada', type: 'number', isOptional: true },
        { name: 'hora_salida', type: 'number', isOptional: true },
        { name: 'latitud_llegada', type: 'number', isOptional: true },
        { name: 'longitud_llegada', type: 'number', isOptional: true },
        { name: 'notas', type: 'string', isOptional: true },
        { name: 'version', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ─── Visitas ───────────────────────────────────────────
    tableSchema({
      name: 'visitas',
      columns: [
        { name: 'server_id', type: 'number', isOptional: true },
        { name: 'cliente_id', type: 'string', isIndexed: true },
        { name: 'cliente_server_id', type: 'number', isOptional: true },
        { name: 'usuario_id', type: 'number' },
        { name: 'ruta_id', type: 'string', isOptional: true },
        { name: 'tipo', type: 'number' }, // 0=Programada..2=Espontanea
        { name: 'resultado', type: 'number' }, // 0=Pendiente..4=Reagendada
        { name: 'check_in_at', type: 'number', isOptional: true },
        { name: 'check_out_at', type: 'number', isOptional: true },
        { name: 'latitud_check_in', type: 'number', isOptional: true },
        { name: 'longitud_check_in', type: 'number', isOptional: true },
        { name: 'distancia_check_in', type: 'number', isOptional: true },
        { name: 'notas', type: 'string', isOptional: true },
        { name: 'activo', type: 'boolean' },
        { name: 'version', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ─── Cobros ────────────────────────────────────────────
    tableSchema({
      name: 'cobros',
      columns: [
        { name: 'server_id', type: 'number', isOptional: true },
        { name: 'cliente_id', type: 'string', isIndexed: true },
        { name: 'cliente_server_id', type: 'number', isOptional: true },
        { name: 'usuario_id', type: 'number' },
        { name: 'pedido_id', type: 'string', isOptional: true },
        { name: 'monto', type: 'number' },
        { name: 'metodo_pago', type: 'number' }, // 0=Efectivo..5=Otro
        { name: 'referencia', type: 'string', isOptional: true },
        { name: 'notas', type: 'string', isOptional: true },
        { name: 'activo', type: 'boolean' },
        { name: 'version', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ─── Attachments (photos, signatures, receipts) ────────
    tableSchema({
      name: 'attachments',
      columns: [
        { name: 'server_id', type: 'number', isOptional: true },
        { name: 'event_type', type: 'string' }, // 'pedido', 'visita', 'cobro'
        { name: 'event_local_id', type: 'string', isIndexed: true },
        { name: 'tipo', type: 'string' }, // 'photo', 'signature', 'receipt'
        { name: 'local_uri', type: 'string' },
        { name: 'remote_url', type: 'string', isOptional: true },
        { name: 'upload_status', type: 'string' }, // 'pending', 'uploading', 'uploaded', 'failed'
        { name: 'retry_count', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ─── Precios por producto (read-only, pricing catalogs) ──
    tableSchema({
      name: 'precios_por_producto',
      columns: [
        { name: 'server_id', type: 'number' },
        { name: 'producto_server_id', type: 'number', isIndexed: true },
        { name: 'lista_precio_id', type: 'number', isIndexed: true },
        { name: 'precio', type: 'number' },
        { name: 'activo', type: 'boolean' },
        { name: 'version', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ─── Descuentos por cantidad (read-only) ─────────────────
    tableSchema({
      name: 'descuentos',
      columns: [
        { name: 'server_id', type: 'number' },
        { name: 'producto_server_id', type: 'number', isOptional: true },
        { name: 'cantidad_minima', type: 'number' },
        { name: 'descuento_porcentaje', type: 'number' },
        { name: 'tipo_aplicacion', type: 'string' }, // 'Global' | 'Producto'
        { name: 'activo', type: 'boolean' },
        { name: 'version', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ─── Promociones (read-only, time-bound) ─────────────────
    tableSchema({
      name: 'promociones',
      columns: [
        { name: 'server_id', type: 'number' },
        { name: 'nombre', type: 'string' },
        { name: 'descuento_porcentaje', type: 'number' },
        { name: 'fecha_inicio', type: 'number' },
        { name: 'fecha_fin', type: 'number' },
        { name: 'producto_ids', type: 'string' }, // JSON array of server IDs
        { name: 'activo', type: 'boolean' },
        { name: 'version', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
