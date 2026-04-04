import { schemaMigrations, addColumns, createTable } from '@nozbe/watermelondb/Schema/migrations';

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
  ],
});
