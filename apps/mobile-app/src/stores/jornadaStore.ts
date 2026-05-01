import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Estado de jornada laboral del vendedor.
 *
 * `activa` controla si el tracking GPS debe estar corriendo. El
 * LocationTrackingBridge en `app/_layout.tsx` arranca/para el timer en función
 * de este flag, no de `isAuthenticated` como antes.
 *
 * Triggers de inicio:
 *  - `iniciarJornada('manual')`: vendedor presionó "Iniciar jornada" en home
 *    → ping `InicioJornada`
 *  - `iniciarJornada('ruta')`: la ruta del día pasó a `EnProgreso`
 *    → ping `InicioRuta`
 *  - Auto-start implícito: primera Venta/Cobro/Visita del día con jornada
 *    inactiva dispara `iniciarJornada('manual')` antes del ping del evento
 *
 * Triggers de fin:
 *  - `finalizarJornada('manual')`: botón "Finalizar jornada" → ping `FinJornada`
 *  - `finalizarJornada('ruta')`: ruta a `Completada` → ping `FinRuta`
 *  - `finalizarJornada('horario')`: watcher detectó salida del horario
 *    laboral configurado → ping `StopAutomatico`
 */

export type JornadaMotivoInicio = 'manual' | 'ruta';
export type JornadaMotivoFin = 'manual' | 'ruta' | 'horario';

interface JornadaState {
  activa: boolean;
  iniciadaEn: number | null;        // ms epoch del inicio actual
  terminadaEn: number | null;       // ms epoch del último fin (para banner reanudar)
  motivoStop: JornadaMotivoFin | null;
  hidratada: boolean;               // true tras leer AsyncStorage en mount

  hidratarDesdeStorage: () => Promise<void>;
  iniciarJornada: (motivo: JornadaMotivoInicio) => Promise<void>;
  finalizarJornada: (motivo: JornadaMotivoFin) => Promise<void>;
  /** Reset solo para tests */
  _reset: () => void;
}

const STORAGE_KEY = 'jornada_state_v2';

interface PersistedState {
  activa: boolean;
  iniciadaEn: number | null;
  terminadaEn: number | null;
  motivoStop: JornadaMotivoFin | null;
}

async function persist(state: PersistedState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore — no es crítico, en próximo mount se recrea desde defaults
  }
}

export const useJornadaStore = create<JornadaState>((set, get) => ({
  activa: false,
  iniciadaEn: null,
  terminadaEn: null,
  motivoStop: null,
  hidratada: false,

  hidratarDesdeStorage: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: PersistedState = JSON.parse(raw);
        set({
          activa: !!parsed.activa,
          iniciadaEn: parsed.iniciadaEn ?? null,
          terminadaEn: parsed.terminadaEn ?? null,
          motivoStop: parsed.motivoStop ?? null,
          hidratada: true,
        });
        return;
      }
    } catch { /* ignore */ }
    set({ hidratada: true });
  },

  iniciarJornada: async (motivo) => {
    if (get().activa) return; // idempotente
    const ahora = Date.now();
    set({ activa: true, iniciadaEn: ahora, terminadaEn: null, motivoStop: null });
    await persist({ activa: true, iniciadaEn: ahora, terminadaEn: null, motivoStop: null });

    // Disparar el ping correspondiente. Importamos lazy para evitar ciclos.
    // Importante: arrancamos el timer ANTES del ping. El bridge useEffect
    // también lo hará por reactividad pero llega 1 tick tarde — sin esto,
    // el primer ping se pierde porque `currentUsuarioId` aún no está set.
    try {
      const { useAuthStore } = await import('./authStore');
      const userId = Number(useAuthStore.getState().user?.id ?? 0);
      const mod = await import('@/services/locationCheckpoint');
      if (userId) {
        mod.startCheckpointTimer(userId);
      }
      const tipo = motivo === 'ruta' ? mod.TipoPing.InicioRuta : mod.TipoPing.InicioJornada;
      await mod.recordPing(tipo);
    } catch {
      // No bloquear si el ping falla — el estado de jornada ya está activo
    }
  },

  finalizarJornada: async (motivo) => {
    if (!get().activa) return; // idempotente
    const ahora = Date.now();
    set({ activa: false, iniciadaEn: null, terminadaEn: ahora, motivoStop: motivo });
    await persist({ activa: false, iniciadaEn: null, terminadaEn: ahora, motivoStop: motivo });

    try {
      const mod = await import('@/services/locationCheckpoint');
      const tipo =
        motivo === 'ruta' ? mod.TipoPing.FinRuta
        : motivo === 'horario' ? mod.TipoPing.StopAutomatico
        : mod.TipoPing.FinJornada;
      await mod.recordPing(tipo);
      // Stop timer al final — el ping de cierre todavía necesita el timer
      // activo (currentUsuarioId queda null si paramos antes del ping).
      mod.stopCheckpointTimer();
    } catch {
      // ignore
    }
  },

  _reset: () => {
    set({ activa: false, iniciadaEn: null, terminadaEn: null, motivoStop: null, hidratada: true });
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },
}));
