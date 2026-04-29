import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 16,
  tables: [
    // ─── Clientes ──────────────────────────────────────────
    tableSchema({
      name: 'clientes',
      columns: [
        { name: 'server_id', type: 'number', isOptional: true },
        { name: 'nombre', type: 'string', isIndexed: true },
        { name: 'nombre_comercial', type: 'string', isOptional: true },
        { name: 'rfc', type: 'string', isOptional: true },
        { name: 'telefono', type: 'string', isOptional: true },
        { name: 'email', type: 'string', isOptional: true },
        { name: 'direccion', type: 'string', isOptional: true },
        { name: 'numero_exterior', type: 'string', isOptional: true },
        { name: 'colonia', type: 'string', isOptional: true },
        { name: 'ciudad', type: 'string', isOptional: true },
        { name: 'estado', type: 'string', isOptional: true },
        { name: 'codigo_postal', type: 'string', isOptional: true },
        { name: 'encargado', type: 'string', isOptional: true },
        { name: 'latitud', type: 'number', isOptional: true },
        { name: 'longitud', type: 'number', isOptional: true },
        { name: 'zona_id', type: 'number', isOptional: true },
        { name: 'categoria_id', type: 'number', isOptional: true },
        { name: 'vendedor_id', type: 'number', isOptional: true },
        { name: 'limite_credito', type: 'number' },
        { name: 'dias_credito', type: 'number' },
        { name: 'descuento', type: 'number' },
        { name: 'saldo', type: 'number' },
        { name: 'venta_minima_efectiva', type: 'number' },
        { name: 'tipos_pago_permitidos', type: 'string' },
        { name: 'tipo_pago_predeterminado', type: 'string' },
        { name: 'notas', type: 'string', isOptional: true },
        { name: 'lista_precios_id', type: 'number', isOptional: true },
        { name: 'es_prospecto', type: 'boolean' },
        { name: 'rfc_fiscal', type: 'string', isOptional: true },
        { name: 'razon_social', type: 'string', isOptional: true },
        { name: 'regimen_fiscal', type: 'string', isOptional: true },
        { name: 'uso_cfdi', type: 'string', isOptional: true },
        { name: 'cp_fiscal', type: 'string', isOptional: true },
        { name: 'requiere_factura', type: 'boolean' },
        { name: 'activo', type: 'boolean', isIndexed: true },
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
        // v16 (2026-04-29): catálogo de impuestos. precio_incluye_iva indica si
        // el `precio` ya tiene IVA dentro (true default — lo que el cliente paga).
        // tasa_impuesto_id es FK al catálogo TasasImpuesto. tasa es la tasa decimal
        // denormalizada (resuelta en backend desde TasaImpuesto.Tasa o default tenant)
        // para que mobile no necesite join offline al calcular ticket.
        { name: 'precio_incluye_iva', type: 'boolean' },
        { name: 'tasa_impuesto_id', type: 'number', isOptional: true },
        { name: 'tasa', type: 'number' },
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
        { name: 'estado', type: 'number', isIndexed: true }, // 0=Borrador..6=Cancelado
        { name: 'tipo_venta', type: 'number' }, // 0=Preventa, 1=VentaDirecta
        { name: 'subtotal', type: 'number' },
        { name: 'descuento', type: 'number' },
        { name: 'impuesto', type: 'number' },
        { name: 'total', type: 'number' },
        { name: 'notas', type: 'string', isOptional: true },
        { name: 'activo', type: 'boolean', isIndexed: true },
        { name: 'version', type: 'number' },
        { name: 'created_at', type: 'number', isIndexed: true },
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
        { name: 'fecha', type: 'number', isIndexed: true },
        { name: 'usuario_id', type: 'number', isIndexed: true },
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
        // v13 (2026-04-27): multi-zona. JSON array de ids de zonas que cubre la
        // ruta. Más simple que junction local porque mobile es read-only de este
        // dato (admin decide desde web). El parsing está en el modelo Ruta.
        { name: 'zonas_json', type: 'string', isOptional: true },
      ],
    }),

    // ─── Ruta Pedidos (pedidos cargados en el camión, junction RutasPedidos) ───
    // Carga del camión: pedidos que el vendedor lleva físicamente para entregar
    // en su ruta. Se sincroniza desde server (read-only en mobile).
    tableSchema({
      name: 'ruta_pedidos',
      columns: [
        { name: 'server_id', type: 'number' },
        { name: 'ruta_id', type: 'string', isIndexed: true },
        { name: 'pedido_id', type: 'string', isIndexed: true },
        { name: 'pedido_server_id', type: 'number' },
        { name: 'estado', type: 'number' }, // 0=Asignado, 1=Entregado, 2=Devuelto
        { name: 'activo', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ─── Ruta Carga (productos sueltos en el camión, junction RutasCarga) ──
    // Productos para venta directa que el vendedor lleva al camión, NO ligados
    // a un pedido específico. Se sincroniza desde server (read-only en mobile).
    tableSchema({
      name: 'ruta_carga',
      columns: [
        { name: 'server_id', type: 'number' },
        { name: 'ruta_id', type: 'string', isIndexed: true },
        { name: 'producto_id', type: 'string', isIndexed: true },
        { name: 'producto_server_id', type: 'number' },
        { name: 'cantidad_entrega', type: 'number' },
        { name: 'cantidad_venta', type: 'number' },
        { name: 'cantidad_total', type: 'number' },
        { name: 'precio_unitario', type: 'number' },
        { name: 'activo', type: 'boolean' },
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
        { name: 'estado', type: 'number', isIndexed: true }, // 0=Pendiente, 1=EnCamino, 2=Visitado, 3=Omitido
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
        { name: 'check_in_at', type: 'number', isOptional: true, isIndexed: true },
        { name: 'check_out_at', type: 'number', isOptional: true },
        { name: 'latitud_check_in', type: 'number', isOptional: true },
        { name: 'longitud_check_in', type: 'number', isOptional: true },
        { name: 'distancia_check_in', type: 'number', isOptional: true },
        { name: 'notas', type: 'string', isOptional: true },
        // Fotos del server (JSON array de URLs). Las visitas creadas localmente
        // usan la tabla `attachments` con upload_status — esta col es solo para
        // mostrar evidencia ya subida cuando el supervisor revisa una visita
        // pulled desde el backend.
        { name: 'fotos_json', type: 'string', isOptional: true },
        { name: 'activo', type: 'boolean', isIndexed: true },
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
        { name: 'activo', type: 'boolean', isIndexed: true },
        { name: 'version', type: 'number' },
        { name: 'created_at', type: 'number', isIndexed: true },
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
        { name: 'upload_status', type: 'string', isIndexed: true }, // 'pending', 'uploading', 'uploaded', 'failed'
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

    // ─── Catalogos basicos read-only (v14, 2026-04-28) ────────
    // Antes vivian en React Query memory y se perdian al cerrar sesion.
    // Ahora persisten en WDB para offline real.
    tableSchema({
      name: 'zonas',
      columns: [
        { name: 'server_id', type: 'number', isIndexed: true },
        { name: 'tenant_id', type: 'number', isIndexed: true },
        { name: 'nombre', type: 'string' },
        { name: 'descripcion', type: 'string', isOptional: true },
        { name: 'activo', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'categorias_cliente',
      columns: [
        { name: 'server_id', type: 'number', isIndexed: true },
        { name: 'tenant_id', type: 'number', isIndexed: true },
        { name: 'nombre', type: 'string' },
        { name: 'descripcion', type: 'string', isOptional: true },
        { name: 'activo', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'categorias_producto',
      columns: [
        { name: 'server_id', type: 'number', isIndexed: true },
        { name: 'tenant_id', type: 'number', isIndexed: true },
        { name: 'nombre', type: 'string' },
        { name: 'descripcion', type: 'string', isOptional: true },
        { name: 'activo', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'familias_producto',
      columns: [
        { name: 'server_id', type: 'number', isIndexed: true },
        { name: 'tenant_id', type: 'number', isIndexed: true },
        { name: 'nombre', type: 'string' },
        { name: 'descripcion', type: 'string', isOptional: true },
        { name: 'activo', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ─── v15 (2026-04-28): catálogos críticos faltantes ────────
    tableSchema({
      name: 'listas_precio',
      columns: [
        { name: 'server_id', type: 'number', isIndexed: true },
        { name: 'tenant_id', type: 'number', isIndexed: true },
        { name: 'nombre', type: 'string' },
        { name: 'descripcion', type: 'string', isOptional: true },
        { name: 'activo', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'usuarios',
      columns: [
        { name: 'server_id', type: 'number', isIndexed: true },
        { name: 'tenant_id', type: 'number', isIndexed: true },
        { name: 'nombre', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'rol', type: 'string', isOptional: true },
        { name: 'avatar_url', type: 'string', isOptional: true },
        { name: 'activo', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'metas_vendedor',
      columns: [
        { name: 'server_id', type: 'number', isIndexed: true },
        { name: 'tenant_id', type: 'number', isIndexed: true },
        { name: 'usuario_id', type: 'number', isIndexed: true },
        { name: 'tipo', type: 'string' },
        { name: 'periodo', type: 'string' },
        { name: 'monto', type: 'number' },
        { name: 'fecha_inicio', type: 'number' },
        { name: 'fecha_fin', type: 'number' },
        { name: 'activo', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    // tasas_impuesto: catálogo read-only sincronizado desde web admin (v16, 2026-04-29).
    // Mobile lo usa para resolver la tasa correcta al calcular tickets, aunque
    // el campo `tasa` también viaja denormalizado en `productos` para evitar lookup.
    tableSchema({
      name: 'tasas_impuesto',
      columns: [
        { name: 'server_id', type: 'number', isIndexed: true },
        { name: 'tenant_id', type: 'number', isIndexed: true },
        { name: 'nombre', type: 'string' },
        { name: 'tasa', type: 'number' },
        { name: 'clave_sat', type: 'string' },
        { name: 'tipo_impuesto', type: 'string' },
        { name: 'es_default', type: 'boolean' },
        { name: 'activo', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    // datos_empresa: 1:1 por tenant. Singleton local.
    tableSchema({
      name: 'datos_empresa',
      columns: [
        { name: 'server_id', type: 'number', isIndexed: true },
        { name: 'tenant_id', type: 'number', isIndexed: true },
        { name: 'razon_social', type: 'string', isOptional: true },
        { name: 'identificador_fiscal', type: 'string', isOptional: true },
        { name: 'tipo_identificador_fiscal', type: 'string' },
        { name: 'telefono', type: 'string', isOptional: true },
        { name: 'email', type: 'string', isOptional: true },
        { name: 'contacto', type: 'string', isOptional: true },
        { name: 'direccion', type: 'string', isOptional: true },
        { name: 'ciudad', type: 'string', isOptional: true },
        { name: 'estado', type: 'string', isOptional: true },
        { name: 'codigo_postal', type: 'string', isOptional: true },
        { name: 'sitio_web', type: 'string', isOptional: true },
        { name: 'descripcion', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
