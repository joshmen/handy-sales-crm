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
  ],
});
