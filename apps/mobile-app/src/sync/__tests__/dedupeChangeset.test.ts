import { dedupeChangeset } from '../dedupeChangeset';

/**
 * Bug prod 2026-06-03 ("Cannot update a record with pending changes
 * pedidos#qQyLko2m8rS8z4fb"): WDB.synchronize() llama prepareUpdate sobre
 * cada raw en `updated[]`. Si el mismo id aparece dos veces el segundo
 * prepareUpdate dispara el invariant y aborta el batch entero, atascando
 * los pending del vendedor.
 *
 * dedupeChangeset() garantiza que cada raw aparece a lo mas una vez.
 */
describe('dedupeChangeset', () => {
  it('deduplica updated[] por id (last write gana)', () => {
    const result = dedupeChangeset({
      created: [],
      updated: [
        { id: 'qQyLko2m8rS8z4fb', total: 50, updated_at: 100 },
        { id: 'qQyLko2m8rS8z4fb', total: 68, updated_at: 200 }, // mas nuevo
        { id: 'otroId', total: 10, updated_at: 100 },
      ],
      deleted: [],
    });

    expect(result.updated).toHaveLength(2);
    const pedido = result.updated.find((r) => r.id === 'qQyLko2m8rS8z4fb');
    expect(pedido?.total).toBe(68);
    expect(pedido?.updated_at).toBe(200);
  });

  it('deduplica created[] por id', () => {
    const result = dedupeChangeset({
      created: [
        { id: 'a1', nombre: 'primero' },
        { id: 'a1', nombre: 'segundo' }, // ultimo gana
        { id: 'a2', nombre: 'otro' },
      ],
      updated: [],
      deleted: [],
    });

    expect(result.created).toHaveLength(2);
    expect(result.created.find((r) => r.id === 'a1')?.nombre).toBe('segundo');
  });

  it('deduplica deleted[] (Set)', () => {
    const result = dedupeChangeset({
      created: [],
      updated: [],
      deleted: ['x', 'y', 'x', 'z', 'y'],
    });

    expect(result.deleted.sort()).toEqual(['x', 'y', 'z']);
  });

  it('no toca arrays sin duplicados', () => {
    const input = {
      created: [{ id: 'a' }, { id: 'b' }],
      updated: [{ id: 'c' }, { id: 'd' }],
      deleted: ['e', 'f'],
    };
    const result = dedupeChangeset(input);

    expect(result.created).toHaveLength(2);
    expect(result.updated).toHaveLength(2);
    expect(result.deleted).toHaveLength(2);
  });

  it('filtra entradas con id vacio en updated/created', () => {
    const result = dedupeChangeset({
      created: [{ id: '', nombre: 'broken' }, { id: 'valid' }],
      updated: [{ id: '', total: 0 }, { id: 'real', total: 10 }],
      deleted: ['', 'real-deleted', ''],
    });

    expect(result.created).toHaveLength(1);
    expect(result.created[0]?.id).toBe('valid');
    expect(result.updated).toHaveLength(1);
    expect(result.updated[0]?.id).toBe('real');
    expect(result.deleted).toEqual(['real-deleted']);
  });

  it('maneja arrays vacios sin throw', () => {
    const result = dedupeChangeset({ created: [], updated: [], deleted: [] });
    expect(result.created).toEqual([]);
    expect(result.updated).toEqual([]);
    expect(result.deleted).toEqual([]);
  });
});
