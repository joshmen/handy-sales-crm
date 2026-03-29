import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

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
  ],
});
