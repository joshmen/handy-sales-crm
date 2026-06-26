// catalogReconcile.ts importa database/api/authStore/AsyncStorage (módulos
// nativos vía Expo). La lógica de decisión `planCatalogReconcile` es PURA, así
// que mockeamos las dependencias pesadas para poder importar el módulo en node.
jest.mock('@/db/database', () => ({ database: {} }));
jest.mock('@/api/client', () => ({ api: {} }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: { getState: () => ({ user: { tenantId: 1 } }) },
}));

import { planCatalogReconcile } from '../catalogReconcile';

describe('planCatalogReconcile — Bug 3 (catálogo stale/renumerado)', () => {
  it('borra locales cuyo server_id ya no existe en el server (renumber/reset)', () => {
    const server = [{ id: 1 }, { id: 3 }, { id: 6 }];
    const localIds = ['1', '3', '6', '50', '99']; // 50 y 99 = stale/huérfanos
    const plan = planCatalogReconcile(server, localIds);

    expect(plan.skipped).toBe(false);
    expect(plan.deleteLocalIds.sort()).toEqual(['50', '99']);
  });

  it('no borra nada cuando local y server coinciden exactamente', () => {
    const plan = planCatalogReconcile([{ id: 1 }, { id: 2 }], ['1', '2']);
    expect(plan).toEqual({ skipped: false, deleteLocalIds: [] });
  });

  it('GUARD anti-wipe: server vacío + local poblado → skipped, NO borra', () => {
    const plan = planCatalogReconcile([], ['1', '2', '3']);
    expect(plan.skipped).toBe(true);
    expect(plan.deleteLocalIds).toEqual([]);
  });

  it('server vacío + local vacío → no skip (no hay catálogo que perder)', () => {
    const plan = planCatalogReconcile([], []);
    expect(plan.skipped).toBe(false);
    expect(plan.deleteLocalIds).toEqual([]);
  });

  it('catálogo que crece: crea nuevos sin borrar (delete vacío)', () => {
    const plan = planCatalogReconcile([{ id: 1 }, { id: 2 }, { id: 3 }], ['1']);
    expect(plan.skipped).toBe(false);
    expect(plan.deleteLocalIds).toEqual([]);
  });

  it('repro Bug 3: id 110 sigue presente en el server → NO se borra (se upsertea su identidad nueva)', () => {
    // El dispositivo tiene WDB "110" (nombre viejo). El server aún tiene id 110
    // (ahora "TATEMADA"). El reconcile NO lo borra: lo upsertea con la identidad
    // actual, corrigiendo el nombre/precio en el dispositivo.
    const plan = planCatalogReconcile([{ id: 110 }], ['110']);
    expect(plan.deleteLocalIds).toEqual([]);
  });

  it('normaliza ids numéricos del server a string (WDB id = String(server_id))', () => {
    const plan = planCatalogReconcile([{ id: 110 }, { id: 7 }], ['110', '7', '8']);
    expect(plan.deleteLocalIds).toEqual(['8']);
  });

  it('dedup: ids duplicados en el server no inflan ni rompen (Set unico)', () => {
    // El server puede emitir el mismo id 2 veces (joins sin DISTINCT). El plan
    // usa un Set, asi que '1' duplicado cuenta una sola vez.
    const plan = planCatalogReconcile([{ id: 1 }, { id: 1 }, { id: 2 }], ['1', '2', '9']);
    expect(plan.skipped).toBe(false);
    expect(plan.deleteLocalIds).toEqual(['9']);
  });

  it('GUARD ratio: local grande + server devuelve fraccion minima → skip (truncado)', () => {
    // Catalogo local de 20, server devuelve 2 (<25%): respuesta truncada → no borrar.
    const localIds = Array.from({ length: 20 }, (_, i) => String(i));
    const plan = planCatalogReconcile([{ id: 100 }, { id: 101 }], localIds);
    expect(plan.skipped).toBe(true);
    expect(plan.deleteLocalIds).toEqual([]);
  });

  it('GUARD ratio NO aplica a catalogos chicos (< umbral) ni a borrados legitimos', () => {
    // Catalogo chico (6 productos jeyma): el guard de ratio no debe dispararse.
    const plan1 = planCatalogReconcile([{ id: 1 }], ['1', '2', '3', '4', '5', '6']);
    expect(plan1.skipped).toBe(false); // 6 < umbral 8 → procede
    expect(plan1.deleteLocalIds).toEqual(['2', '3', '4', '5', '6']);

    // Borrado legitimo moderado: local 100, server 70 (>=25%) → procede.
    const local100 = Array.from({ length: 100 }, (_, i) => String(i));
    const server70 = Array.from({ length: 70 }, (_, i) => ({ id: i }));
    const plan2 = planCatalogReconcile(server70, local100);
    expect(plan2.skipped).toBe(false);
    expect(plan2.deleteLocalIds).toHaveLength(30);
  });
});
