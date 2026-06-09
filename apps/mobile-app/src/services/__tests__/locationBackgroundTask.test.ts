// 2026-06-08 — Tests del throttle pre-persist anti-spam GPS.
// `filterCheckpointsByThrottle` extraido a locationThrottle.ts (modulo puro
// sin deps nativas) para que ts-jest pueda testearlo sin mockear el bridge
// RN entero ni WatermelonDB.

import {
  filterCheckpointsByThrottle,
  ACCURACY_MAX_METERS,
  MIN_INTERVAL_SECONDS,
  MIN_DISTANCE_METERS,
  type CheckpointInput,
} from '../locationThrottle';

function makeLoc(opts: {
  ts: number;
  lat: number;
  lng: number;
  accuracy?: number | null;
}): CheckpointInput {
  return {
    timestamp: opts.ts,
    coords: {
      latitude: opts.lat,
      longitude: opts.lng,
      accuracy: opts.accuracy === undefined ? 10 : opts.accuracy,
    },
  };
}

describe('filterCheckpointsByThrottle — anti-spam pre-persist', () => {
  const T0 = Date.UTC(2026, 5, 8, 12, 0, 0); // 2026-06-08 12:00:00 UTC

  it('exporta constantes con valores esperados del plan', () => {
    expect(ACCURACY_MAX_METERS).toBe(100);
    expect(MIN_INTERVAL_SECONDS).toBe(60);
    expect(MIN_DISTANCE_METERS).toBe(50);
  });

  it('sin lastPersisted: acepta el primer ping (acceptable accuracy)', () => {
    const locs = [makeLoc({ ts: T0, lat: 19.4326, lng: -99.1332 })];
    const accepted = filterCheckpointsByThrottle(locs, null);
    expect(accepted).toHaveLength(1);
  });

  it('descarta ping con accuracy > 100m (basura)', () => {
    const locs = [makeLoc({ ts: T0, lat: 19.4326, lng: -99.1332, accuracy: 250 })];
    const accepted = filterCheckpointsByThrottle(locs, null);
    expect(accepted).toHaveLength(0);
  });

  it('descarta ping sin accuracy (null/undefined treats as bad)', () => {
    const locs = [makeLoc({ ts: T0, lat: 19.4326, lng: -99.1332, accuracy: null })];
    const accepted = filterCheckpointsByThrottle(locs, null);
    expect(accepted).toHaveLength(0);
  });

  it('REGRESSION 2026-06-08 anti-spam: 10 pings al mismo punto en 90s → 2 aceptados', () => {
    // El bug staging: 10 pings entre 08:56:59 y 08:58:43 (104s), mismo
    // tenant+usuario, todos persistidos. Post-fix: el ping en T0 pasa (no hay
    // last), el de T0+10s al T0+50s se throttlean (<60s + 0m), el de T0+60s
    // pasa (dt=60s no es <60s estricto), el resto se throttlean vs T0+60s.
    // Total: 2 aceptados vs 10 originales. Pre-fix se persistian los 10.
    const locs = Array.from({ length: 10 }, (_, i) =>
      makeLoc({ ts: T0 + i * 10_000, lat: 19.4326, lng: -99.1332 }),
    );
    const accepted = filterCheckpointsByThrottle(locs, null);
    expect(accepted).toHaveLength(2);
    expect(accepted[0].timestamp).toBe(T0);
    expect(accepted[1].timestamp).toBe(T0 + 60_000);
  });

  it('separados >= 60s aunque misma ubicacion: ambos pasan (throttle requiere AMBAS)', () => {
    // 2 pings, 61s apart, misma ubicacion: el segundo pasa porque dt>=60s.
    // El throttle solo bloquea si AMBAS condiciones (tiempo Y distancia).
    const locs = [
      makeLoc({ ts: T0, lat: 19.4326, lng: -99.1332 }),
      makeLoc({ ts: T0 + 61_000, lat: 19.4326, lng: -99.1332 }),
    ];
    const accepted = filterCheckpointsByThrottle(locs, null);
    expect(accepted).toHaveLength(2);
  });

  it('separados <60s pero > 50m de distancia: ambos pasan (movimiento)', () => {
    // 0.001 grado lat ≈ 111m, mayor a 50m
    const locs = [
      makeLoc({ ts: T0, lat: 19.4326, lng: -99.1332 }),
      makeLoc({ ts: T0 + 10_000, lat: 19.4336, lng: -99.1332 }),
    ];
    const accepted = filterCheckpointsByThrottle(locs, null);
    expect(accepted).toHaveLength(2);
  });

  it('cuando hay lastPersisted reciente: throttle aplica al primer ping del batch', () => {
    const last = {
      capturadoEn: new Date(T0 - 30_000), // 30s antes del primer ping del batch
      latitud: 19.4326,
      longitud: -99.1332,
    };
    const locs = [makeLoc({ ts: T0, lat: 19.4326, lng: -99.1332 })];
    const accepted = filterCheckpointsByThrottle(locs, last);
    // 30s < 60s + misma ubicacion: throttle.
    expect(accepted).toHaveLength(0);
  });

  it('cuando lastPersisted es viejo: primer ping del batch entra', () => {
    const last = {
      capturadoEn: new Date(T0 - 120_000), // 2min antes
      latitud: 19.4326,
      longitud: -99.1332,
    };
    const locs = [makeLoc({ ts: T0, lat: 19.4326, lng: -99.1332 })];
    const accepted = filterCheckpointsByThrottle(locs, last);
    expect(accepted).toHaveLength(1);
  });

  it('vendedor caminando ~3km/h (50m por minuto): 1-2 pings por minuto', () => {
    // Simular 12 pings a 5s intervalo (cada uno ~4m al avanzar a 3km/h)
    // El primero pasa; los siguientes son <60s y mostly <50m → throttle.
    const stepLat = 0.000036; // ~4m por step at lat 19
    const locs: CheckpointInput[] = [];
    for (let i = 0; i < 12; i++) {
      locs.push(makeLoc({ ts: T0 + i * 5_000, lat: 19.4326 + i * stepLat, lng: -99.1332 }));
    }
    const accepted = filterCheckpointsByThrottle(locs, null);
    expect(accepted.length).toBeGreaterThanOrEqual(1);
    expect(accepted.length).toBeLessThanOrEqual(3);
  });

  it('vendedor en vehiculo (50km/h): pasa por distancia mucho antes que por tiempo', () => {
    // 50km/h = ~14m/s. A 10s = 140m → > 50m, pasa.
    const stepLat = 0.0012; // ~140m
    const locs = [
      makeLoc({ ts: T0, lat: 19.4326, lng: -99.1332 }),
      makeLoc({ ts: T0 + 10_000, lat: 19.4326 + stepLat, lng: -99.1332 }),
      makeLoc({ ts: T0 + 20_000, lat: 19.4326 + 2 * stepLat, lng: -99.1332 }),
    ];
    const accepted = filterCheckpointsByThrottle(locs, null);
    expect(accepted).toHaveLength(3);
  });
});
