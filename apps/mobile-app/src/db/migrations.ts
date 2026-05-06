import { schemaMigrations, addColumns, createTable, unsafeExecuteSql } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'pedidos',
          columns: [
            { name: 'numero_pedido', type: 'string', isOptional: true },
            { name: 'fecha_pedido', type: 'number', isOptional: true },
            { name: 'descuento', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 3,
      steps: [
        addColumns({
          table: 'pedidos',
          columns: [
            { name: 'tipo_venta', type: 'number' },
          ],
        }),
        addColumns({
          table: 'cobros',
          columns: [
            { name: 'pedido_id', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 4,
      steps: [
        addColumns({
          table: 'clientes',
          columns: [
            { name: 'es_prospecto', type: 'boolean' },
          ],
        }),
      ],
    },
    {
      toVersion: 5,
      steps: [
        addColumns({
          table: 'ruta_detalles',
          columns: [
            { name: 'pedido_id', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 6,
      steps: [
        addColumns({
          table: 'rutas',
          columns: [
            { name: 'hora_inicio_estimada', type: 'string', isOptional: true },
            { name: 'hora_fin_estimada', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 7,
      steps: [
        addColumns({
          table: 'clientes',
          columns: [
            { name: 'lista_precios_id', type: 'number', isOptional: true },
          ],
        }),
        createTable({
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
        createTable({
          name: 'descuentos',
          columns: [
            { name: 'server_id', type: 'number' },
            { name: 'producto_server_id', type: 'number', isOptional: true },
            { name: 'cantidad_minima', type: 'number' },
            { name: 'descuento_porcentaje', type: 'number' },
            { name: 'tipo_aplicacion', type: 'string' },
            { name: 'activo', type: 'boolean' },
            { name: 'version', type: 'number' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'promociones',
          columns: [
            { name: 'server_id', type: 'number' },
            { name: 'nombre', type: 'string' },
            { name: 'descuento_porcentaje', type: 'number' },
            { name: 'fecha_inicio', type: 'number' },
            { name: 'fecha_fin', type: 'number' },
            { name: 'producto_ids', type: 'string' },
            { name: 'activo', type: 'boolean' },
            { name: 'version', type: 'number' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 8,
      steps: [
        addColumns({
          table: 'clientes',
          columns: [
            { name: 'rfc_fiscal', type: 'string', isOptional: true },
            { name: 'razon_social', type: 'string', isOptional: true },
            { name: 'regimen_fiscal', type: 'string', isOptional: true },
            { name: 'uso_cfdi', type: 'string', isOptional: true },
            { name: 'cp_fiscal', type: 'string', isOptional: true },
            { name: 'requiere_factura', type: 'boolean' },
          ],
        }),
      ],
    },
    {
      toVersion: 9,
      steps: [
        addColumns({
          table: 'clientes',
          columns: [
            // Dirección desglosada
            { name: 'numero_exterior', type: 'string', isOptional: true },
            { name: 'colonia', type: 'string', isOptional: true },
            // Contacto
            { name: 'encargado', type: 'string', isOptional: true },
            // Comerciales
            { name: 'descuento', type: 'number' },
            { name: 'saldo', type: 'number' },
            { name: 'venta_minima_efectiva', type: 'number' },
            // Reglas de pago
            { name: 'tipos_pago_permitidos', type: 'string' },
            { name: 'tipo_pago_predeterminado', type: 'string' },
          ],
        }),
      ],
    },
    {
      // v10: índices en columnas hot path identificadas en sweep de performance.
      // Sin estos, queries con .where() y .sortBy() sobre estas columnas hacen
      // full table scan — perceptible con 1000+ filas.
      toVersion: 10,
      steps: [
        // clientes: búsqueda por nombre (Q.like en useOfflineClients) + filtro activo
        unsafeExecuteSql('CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre);'),
        unsafeExecuteSql('CREATE INDEX IF NOT EXISTS idx_clientes_activo ON clientes(activo);'),
        // pedidos: filtros estado + sort created_at + activo
        unsafeExecuteSql('CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);'),
        unsafeExecuteSql('CREATE INDEX IF NOT EXISTS idx_pedidos_activo ON pedidos(activo);'),
        unsafeExecuteSql('CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON pedidos(created_at);'),
        // cobros: filtro Q.gte(today) + activo + sort
        unsafeExecuteSql('CREATE INDEX IF NOT EXISTS idx_cobros_activo ON cobros(activo);'),
        unsafeExecuteSql('CREATE INDEX IF NOT EXISTS idx_cobros_created_at ON cobros(created_at);'),
        // visitas: filtro Q.gte(check_in_at) + activo
        unsafeExecuteSql('CREATE INDEX IF NOT EXISTS idx_visitas_activo ON visitas(activo);'),
        unsafeExecuteSql('CREATE INDEX IF NOT EXISTS idx_visitas_check_in_at ON visitas(check_in_at);'),
        // attachments: filtro upload_status oneOf
        unsafeExecuteSql('CREATE INDEX IF NOT EXISTS idx_attachments_upload_status ON attachments(upload_status);'),
        // rutas: filtro fecha window + usuario_id
        unsafeExecuteSql('CREATE INDEX IF NOT EXISTS idx_rutas_fecha ON rutas(fecha);'),
        unsafeExecuteSql('CREATE INDEX IF NOT EXISTS idx_rutas_usuario_id ON rutas(usuario_id);'),
        // ruta_detalles: filtro estado
        unsafeExecuteSql('CREATE INDEX IF NOT EXISTS idx_ruta_detalles_estado ON ruta_detalles(estado);'),
      ],
    },
    {
      // v11: fotos_json en visitas. El backend (ClienteVisita.Fotos) emite un JSON
      // array de URLs de fotos ya subidas. Antes el mapper lo ignoraba y el
      // supervisor no veia evidencia de visitas creadas en otras apps. Esta
      // columna NO reemplaza la tabla attachments (visitas creadas localmente
      // siguen usando attachments con upload retry); solo es para mostrar
      // evidencia ya hecha cuando se hace pull del server.
      toVersion: 11,
      steps: [
        addColumns({
          table: 'visitas',
          columns: [
            { name: 'fotos_json', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      // v12: tablas ruta_pedidos y ruta_carga. Antes el sync solo traía paradas
      // (ruta_detalles); el vendedor en mobile no veía qué pedidos llevaba en el
      // camión ni qué productos sueltos tenía para venta directa. Reportado
      // 2026-04-27. Backend ya envía estos campos (commit 670e1b5) — esta
      // migration crea las tablas locales para consumirlos.
      toVersion: 12,
      steps: [
        createTable({
          name: 'ruta_pedidos',
          columns: [
            { name: 'server_id', type: 'number' },
            { name: 'ruta_id', type: 'string', isIndexed: true },
            { name: 'pedido_id', type: 'string', isIndexed: true },
            { name: 'pedido_server_id', type: 'number' },
            { name: 'estado', type: 'number' },
            { name: 'activo', type: 'boolean' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
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
      ],
    },
    {
      // v13: multi-zona en rutas. Backend ahora envía SyncRutaDto.ZonaIds[]
      // (commit 26dab2a) — agregar columna JSON local para almacenar la lista.
      // Más simple que junction local porque mobile no puede modificar zonas
      // (read-only). Reportado 2026-04-27 — alineado con SFA/CPG industria
      // (Handy.la, Salesforce Field Service, SAP Sales Cloud, Onfleet).
      toVersion: 13,
      steps: [
        addColumns({
          table: 'rutas',
          columns: [
            { name: 'zonas_json', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      // v14: persistir catalogos (zonas, categorias_cliente, categorias_producto,
      // familias_producto) en WatermelonDB. Antes solo vivian en React Query memory
      // y se perdian al cerrar sesion — el vendedor tenia que re-loguear cada vez
      // para tenerlos. Backend ahora los incluye en /api/mobile/sync/pull (commit
      // pendiente). Reportado 2026-04-28.
      toVersion: 14,
      steps: [
        createTable({
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
        createTable({
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
        createTable({
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
        createTable({
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
      ],
    },
    {
      // v15 (2026-04-28): catalogos criticos faltantes — listas_precio (cliente
      // tenia listaPreciosId pero mobile no sabia el nombre, vendedor offline no
      // sabia que lista aplicar), usuarios (equipo para supervisores que asignan
      // rutas), metas_vendedor (dashboard), datos_empresa (logo + razon social
      // que antes solo vivian en GET /api/mobile/empresa en memory).
      toVersion: 15,
      steps: [
        createTable({
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
        createTable({
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
        createTable({
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
        createTable({
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
    },
    {
      // v16 (2026-04-29): catálogo de impuestos.
      // - productos: precio_incluye_iva (default true), tasa_impuesto_id, tasa
      //   denormalizada (resuelta en backend desde TasaImpuesto.Tasa o default tenant).
      // - tasas_impuesto: nueva tabla read-only del catálogo del tenant.
      // Arregla bug 2026-04-28: tickets cobraban IVA sobre precios que ya lo incluían.
      toVersion: 16,
      steps: [
        addColumns({
          table: 'productos',
          columns: [
            { name: 'precio_incluye_iva', type: 'boolean' },
            { name: 'tasa_impuesto_id', type: 'number', isOptional: true },
            { name: 'tasa', type: 'number' },
          ],
        }),
        createTable({
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
      ],
    },
    {
      // v17 (2026-04-29): elimina la tabla `tasas_impuesto`. El catálogo de
      // impuestos vive solo en backend; mobile resuelve cálculos con los
      // campos denormalizados `producto.tasa` y `producto.precioIncluyeIva`.
      // Devices que estaban en v16 dropean la tabla — ningún query la
      // consultaba (era dead weight). El cálculo del ticket sigue intacto.
      toVersion: 17,
      steps: [
        unsafeExecuteSql('DROP TABLE IF EXISTS tasas_impuesto;'),
      ],
    },
    {
      // v18 (2026-04-29): promociones BOGO acumulativo.
      // - promociones: tipo_promocion (0=Porcentaje, 1=Regalo), cantidad_compra,
      //   cantidad_bonificada, producto_bonificado_id.
      // - detalle_pedidos: cantidad_bonificada (audita unidades regaladas en
      //   la línea), promocion_id (server valida al push).
      toVersion: 18,
      steps: [
        addColumns({
          table: 'promociones',
          columns: [
            { name: 'tipo_promocion', type: 'number' },
            { name: 'cantidad_compra', type: 'number', isOptional: true },
            { name: 'cantidad_bonificada', type: 'number', isOptional: true },
            { name: 'producto_bonificado_id', type: 'number', isOptional: true },
          ],
        }),
        addColumns({
          table: 'detalle_pedidos',
          columns: [
            { name: 'cantidad_bonificada', type: 'number' },
            { name: 'promocion_id', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
    {
      // v19 (2026-05-01): tracking GPS continuo de vendedores. Tabla nueva
      // `ubicaciones_vendedor` para encolar pings offline. Devices en v18
      // migran auto al abrir la app; ningún query existente se afecta.
      toVersion: 19,
      steps: [
        createTable({
          name: 'ubicaciones_vendedor',
          columns: [
            { name: 'usuario_id', type: 'number', isIndexed: true },
            { name: 'latitud', type: 'number' },
            { name: 'longitud', type: 'number' },
            { name: 'precision_metros', type: 'number', isOptional: true },
            { name: 'tipo', type: 'number' },
            { name: 'capturado_en', type: 'number' },
            { name: 'referencia_id', type: 'number', isOptional: true },
            { name: 'sincronizado', type: 'boolean', isIndexed: true },
            { name: 'created_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      // v20 (2026-05-05): coords del momento de venta en `pedidos`. Antes
      // los pedidos no almacenaban lat/long propias — el GPS ping iba a
      // tabla aparte (`ubicaciones_vendedor`) y la pantalla GPS Activity
      // del backend filtraba por `Pedido.Latitud != null` mostrando 3/5
      // pedidos del vendedor (los que tenían coords del cliente como
      // fallback). Ahora `captureOrderLocation` setea estos campos al
      // momento de crear pedido con cascada device GPS → lastKnown →
      // cliente coords.
      toVersion: 20,
      steps: [
        addColumns({
          table: 'pedidos',
          columns: [
            { name: 'latitud', type: 'number', isOptional: true },
            { name: 'longitud', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
    {
      // v21: tracking realtime de progreso de carga. CantidadVendida se
      // incrementa al hacer venta directa con ruta activa; CantidadEntregada
      // al marcar pedido pre-asignado como Entregado. Permite mostrar
      // progreso en mobile sin esperar al cierre manual del admin.
      toVersion: 21,
      steps: [
        addColumns({
          table: 'ruta_carga',
          columns: [
            { name: 'cantidad_vendida', type: 'number' },
            { name: 'cantidad_entregada', type: 'number' },
          ],
        }),
      ],
    },
  ],
});
