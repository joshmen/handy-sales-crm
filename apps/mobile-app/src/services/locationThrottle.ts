/**
 * Pure throttle logic para los Checkpoints GPS — extraido a un modulo sin
 * dependencias nativas (expo-location, WatermelonDB, TaskManager) para que
 * sea testeable con ts-jest sin tener que mockear el bridge RN entero.
 *
 * Importado por `locationBackgroundTask.ts` (background) y por los Jest tests.
 * 2026-06-08 — anti-spam GPS bug.
 */
import { haversineMeters } from '@/utils/haversine';

/**
 * Constants del throttle. Alineadas con backend UbicacionVendedorService
 * (CheckpointMinInterval=60s, CheckpointMinDistanceKm=0.050).
 *
 * Criterios para PERSISTIR un Checkpoint vs descartar:
 *  - ACCURACY_MAX_METERS: pings con accuracy peor descartados (basura, urban canyon)
 *  - MIN_INTERVAL_SECONDS: minimo desde ultimo Checkpoint persistido
 *  - MIN_DISTANCE_METERS: minimo desde ultimo Checkpoint persistido
 *
 * Vendedor caminando ~3km/h ≈ 1 ping/min. Parado: 0 pings. Vehiculo 50km/h:
 * throttled a 1/min por tiempo (la distancia ya alcanza en 4s).
 * Proyeccion <100 pings/jornada-8h vs ~14k del bug actual.
 */
export const ACCURACY_MAX_METERS = 100;
export const MIN_INTERVAL_SECONDS = 60;
export const MIN_DISTANCE_METERS = 50;

/**
 * Subset minimal del expo-location LocationObject — solo lo que usamos.
 * Evita import directo de expo-location en este modulo puro.
 */
export interface CheckpointInput {
  timestamp?: number;
  coords: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  };
}

export interface PersistedCheckpoint {
  capturadoEn: Date;
  latitud: number;
  longitud: number;
}

/**
 * Filtra una lista de candidate Checkpoints contra el ultimo Checkpoint
 * persistido del usuario. Iterativo: actualiza el "last" con cada accepted
 * para que dentro del mismo batch tambien se respete el throttle.
 *
 * Throttle aplicado solo si AMBAS condiciones se cumplen simultaneamente
 * (dt < MIN_INTERVAL_SECONDS AND dist < MIN_DISTANCE_METERS). Asi vendedor
 * en vehiculo (mucha distancia rapido) pasa, y vendedor parado mucho tiempo
 * tambien — uno solo de los dos cap es suficiente para liberar el ping.
 */
export function filterCheckpointsByThrottle(
  locations: CheckpointInput[],
  lastPersisted: PersistedCheckpoint | null,
): CheckpointInput[] {
  const accepted: CheckpointInput[] = [];
  let last = lastPersisted;
  for (const loc of locations) {
    const accuracy = loc.coords.accuracy ?? 999;
    if (accuracy > ACCURACY_MAX_METERS) {
      // Descartado por accuracy basura (urban canyon, primer fix, etc).
      continue;
    }
    if (last) {
      const dtSec = (new Date(loc.timestamp ?? Date.now()).getTime() - last.capturadoEn.getTime()) / 1000;
      if (dtSec < MIN_INTERVAL_SECONDS) {
        const dist = haversineMeters(
          { latitud: loc.coords.latitude, longitud: loc.coords.longitude },
          { latitud: last.latitud, longitud: last.longitud },
        );
        if (dist < MIN_DISTANCE_METERS) {
          continue;
        }
      }
    }
    accepted.push(loc);
    last = {
      capturadoEn: new Date(loc.timestamp ?? Date.now()),
      latitud: loc.coords.latitude,
      longitud: loc.coords.longitude,
    };
  }
  return accepted;
}
