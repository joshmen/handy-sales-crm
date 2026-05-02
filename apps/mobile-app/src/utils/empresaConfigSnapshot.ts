// Snapshot síncrono de la configuración del tenant (subset de useEmpresa).
//
// Motivación: services NO React (locationCheckpoint.ts) necesitan leer
// `horaInicioJornada/horaFinJornada/diasLaborables/modoVentaDefault` para
// decidir si auto-iniciar jornada o no. No pueden usar el hook useEmpresa
// porque corren fuera del árbol React.
//
// Pattern: el componente _layout.tsx (que sí usa useEmpresa) llama a
// `setEmpresaConfigSnapshot` cada vez que el query data cambia. El service
// llama a `getEmpresaConfigSnapshot()` síncrono para tomar la última versión
// vista. Persistimos en AsyncStorage para sobrevivir restarts (la primera
// venta del día post-restart aún puede tomar el snapshot del día anterior).

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface EmpresaConfigSnapshot {
  horaInicioJornada: string | null;
  horaFinJornada: string | null;
  diasLaborables: string | null;
  modoVentaDefault: string | null;
}

const STORAGE_KEY = 'empresa_config_snapshot_v1';

let inMemorySnapshot: EmpresaConfigSnapshot | null = null;

export function getEmpresaConfigSnapshot(): EmpresaConfigSnapshot | null {
  return inMemorySnapshot;
}

export async function setEmpresaConfigSnapshot(snapshot: EmpresaConfigSnapshot): Promise<void> {
  inMemorySnapshot = snapshot;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore — fallar la persistencia no debe bloquear el flujo
  }
}

/**
 * Re-hidrata el snapshot desde AsyncStorage al primer mount post-restart.
 * Después el `useEmpresa` lo refresca cuando llega la respuesta del backend.
 */
export async function hydrateEmpresaConfigSnapshot(): Promise<EmpresaConfigSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as EmpresaConfigSnapshot;
      inMemorySnapshot = parsed;
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}
