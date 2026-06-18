// mappers.ts importa `database` (que arrastra módulos nativos de Expo) y `Q`.
// El push (mapPushFromWatermelon) es un transform puro raw→dto que NO toca la
// DB, así que mockeamos el módulo para poder importar mappers en ts-jest/node.
jest.mock('@/db/database', () => ({ database: {} }));

import { mapPushFromWatermelon } from '../mappers';

describe('mapPushFromWatermelon — pedidos.tipoVenta', () => {
  it('propaga tipoVenta del raw (venta directa = 1) al pedido dto', async () => {
    const out = await mapPushFromWatermelon({
      pedidos: {
        created: [{
          id: 'wdb-ped-1', server_id: null, cliente_server_id: 10,
          created_at: Date.parse('2026-06-12T10:00:00Z'),
          estado: 5, tipo_venta: 1, subtotal: 100, impuesto: 16, total: 116,
          notas: null, latitud: null, longitud: null, activo: true, version: 1,
        }],
        updated: [],
        deleted: [],
      },
      detalle_pedidos: { created: [], updated: [], deleted: [] },
    } as any);

    expect(out.pedidos).toHaveLength(1);
    expect(out.pedidos[0].tipoVenta).toBe(1);
  });

  it('tipoVenta = 0 (preventa) cuando el raw no lo trae', async () => {
    const out = await mapPushFromWatermelon({
      pedidos: {
        created: [{
          id: 'wdb-ped-2', server_id: null, cliente_server_id: 10,
          created_at: Date.parse('2026-06-12T10:00:00Z'),
          estado: 1, subtotal: 50, impuesto: 8, total: 58,
          activo: true, version: 1,
        }],
        updated: [],
        deleted: [],
      },
      detalle_pedidos: { created: [], updated: [], deleted: [] },
    } as any);

    expect(out.pedidos[0].tipoVenta).toBe(0);
  });
});

describe('mapPushFromWatermelon — rutaDetalles (estado de parada)', () => {
  it('parada Omitida (estado=3): razonOmision = notas, notas = null (sin colisión)', async () => {
    const out = await mapPushFromWatermelon({
      ruta_detalles: {
        updated: [{
          id: 'wdb-rd-1', server_id: 501, cliente_server_id: 10,
          orden: 1, estado: 3, notas: 'Cliente cerrado',
          hora_llegada: null, hora_salida: null,
          latitud_llegada: null, longitud_llegada: null,
          pedido_id: null, version: 2,
        }],
      },
    } as any);

    expect(out.rutaDetalles).toHaveLength(1);
    const dto = out.rutaDetalles[0];
    expect(dto.id).toBe(501);
    expect(dto.estado).toBe(3);
    expect(dto.razonOmision).toBe('Cliente cerrado');
    expect(dto.notas).toBeNull();
    // El móvil nunca manda estos ids; el backend conserva el vínculo existente.
    expect(dto.visitaId).toBeNull();
    expect(dto.pedidoId).toBeNull();
  });

  it('parada Visitada (estado=2): razonOmision = null, notas preservada', async () => {
    const out = await mapPushFromWatermelon({
      ruta_detalles: {
        updated: [{
          id: 'wdb-rd-2', server_id: 502, cliente_server_id: 10,
          orden: 2, estado: 2, notas: 'Entregado OK',
          hora_llegada: Date.parse('2026-06-12T11:00:00Z'),
          hora_salida: Date.parse('2026-06-12T11:15:00Z'),
          latitud_llegada: 19.4, longitud_llegada: -99.1,
          pedido_id: null, version: 3,
        }],
      },
    } as any);

    const dto = out.rutaDetalles[0];
    expect(dto.estado).toBe(2);
    expect(dto.razonOmision).toBeNull();
    expect(dto.notas).toBe('Entregado OK');
  });

  it('excluye del push las paradas sin server_id (dto.Id=0 no resoluble en backend)', async () => {
    const out = await mapPushFromWatermelon({
      ruta_detalles: {
        updated: [
          { id: 'wdb-rd-3', server_id: null, estado: 2, notas: null },
          { id: 'wdb-rd-4', server_id: 503, estado: 2, notas: null },
        ],
      },
    } as any);

    expect(out.rutaDetalles).toHaveLength(1);
    expect(out.rutaDetalles[0].id).toBe(503);
  });
});
