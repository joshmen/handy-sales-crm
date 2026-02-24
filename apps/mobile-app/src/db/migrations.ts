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
  ],
});
