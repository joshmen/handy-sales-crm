import { resolveConflict } from '../conflictResolver';

describe('conflictResolver — pedidos estado ratchet', () => {
  it('REGRESSION 2026-06-08: preserva estado=5 local cuando remote=0 (createVentaDirectaOffline)', () => {
    // WDB no marca estado en _changed cuando se setea dentro de .create() builder
    // (Model._prepareCreate fuerza _preparedState='create' → _setRaw skipea
    // setRawColumnChange). Por eso resolved.estado llega como 0 (per-column
    // merge usa remote). El resolver DEBE rescatar el 5 local vía Math.max.
    const local = { estado: 5, _status: 'created', _changed: '' };
    const remote = { estado: 0 };
    const resolved = { id: 'p1', estado: 0, total: 100, notas: 'venta directa' };
    const out = resolveConflict('pedidos', local, remote, resolved);
    expect(out.estado).toBe(5);
    expect(out.notas).toBe('venta directa');
    expect(out.total).toBe(100);
  });

  it('server-wins cuando admin avanza Confirmado(2) → EnRuta(4)', () => {
    const out = resolveConflict('pedidos', { estado: 2 }, { estado: 4 }, {
      id: 'p1',
      estado: 4,
    });
    expect(out.estado).toBe(4);
  });

  it('server-wins cuando admin cancela (Borrador(0) → Cancelado(6))', () => {
    const out = resolveConflict('pedidos', { estado: 0 }, { estado: 6 }, {
      id: 'p1',
      estado: 6,
    });
    expect(out.estado).toBe(6);
  });

  it('TELEMETRY: warn cuando Math.max sobreescribe estado terminal local Entregado(5)→Cancelado(6) (race device A entregó, device B canceló)', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    resolveConflict('pedidos', { estado: 5 }, { estado: 6 }, {
      id: 'p1',
      estado: 6,
    });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('terminal state'),
      expect.objectContaining({ id: 'p1', local: 5, remote: 6, winning: 6 }),
    );
    warnSpy.mockRestore();
  });

  it('TELEMETRY: NO warn cuando local no es terminal (0, 2, 4)', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    resolveConflict('pedidos', { estado: 2 }, { estado: 6 }, {
      id: 'p1',
      estado: 6,
    });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('estable cuando local === remote (no flapping, no warn)', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const out = resolveConflict('pedidos', { estado: 4 }, { estado: 4 }, {
      id: 'p1',
      estado: 4,
    });
    expect(out.estado).toBe(4);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('defensive: estado no-number → fallback 0', () => {
    const out = resolveConflict('pedidos', { estado: undefined }, { estado: 'broken' }, {
      id: 'p1',
      estado: 0,
    });
    expect(out.estado).toBe(0);
  });

  // SEMANTIC GUARD: si alguien agrega un estado nuevo > 6 al enum,
  // este test obliga revisar el resolver.
  it('SEMANTIC GUARD: orden actual del enum Borrador(0) < Confirmado(2) < EnRuta(4) < Entregado(5) < Cancelado(6)', () => {
    const order = [0, 2, 4, 5, 6];
    for (let i = 1; i < order.length; i++) {
      expect(order[i]).toBeGreaterThan(order[i - 1]);
    }
  });
});

describe('conflictResolver — cobros last-write-wins', () => {
  it('server wins si remote.updated_at > local.updated_at', () => {
    const out = resolveConflict(
      'cobros',
      { updated_at: 100 },
      { updated_at: 200, monto: 50 },
      { id: 'c1', updated_at: 100, monto: 30 },
    );
    expect(out.monto).toBe(50);
  });

  it('client (resolved) wins si timestamps iguales', () => {
    const resolved = { id: 'c1', updated_at: 100, monto: 30 };
    const out = resolveConflict(
      'cobros',
      { updated_at: 100 },
      { updated_at: 100 },
      resolved,
    );
    expect(out).toBe(resolved);
  });

  it('client (resolved) wins si remote es más viejo', () => {
    const resolved = { id: 'c1', updated_at: 200, monto: 30 };
    const out = resolveConflict(
      'cobros',
      { updated_at: 200 },
      { updated_at: 100, monto: 50 },
      resolved,
    );
    expect(out).toBe(resolved);
    expect(out.monto).toBe(30);
  });
});

describe('conflictResolver — default per-column (tablas sin branch)', () => {
  it('retorna resolved tal cual para tablas no manejadas (clientes, visitas, etc.)', () => {
    const resolved = { id: 'x1', foo: 'bar' };
    const out = resolveConflict('visitas', { foo: 'local' }, { foo: 'remote' }, resolved);
    expect(out).toBe(resolved);
  });
});
