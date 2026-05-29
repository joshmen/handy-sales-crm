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
export type JornadaMotivoFin = 'manual' | 'ruta' | 'horario' | 'inactividad';

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

        // Day-rollover guard: si jornada quedó "activa" pero su iniciadaEn es
        // de un día anterior, la consideramos huérfana y la reseteamos. Caso:
        // el vendedor cerró la app sin presionar "Cerrar jornada" (los
        // watchers de horario/inactividad solo corren con la app abierta), la
        // jornada quedó como activa=true en AsyncStorage. Al día siguiente,
        // la primera Venta no auto-inicia porque el guard `!jornada.activa`
        // ve activa=true, y por tanto no emite InicioJornada para el nuevo día.
        // motivoStop='horario' (no 'manual') para que la auto-start de
        // locationCheckpoint.recordPing SÍ pueda reactivar la jornada con la
        // primera Venta/Cobro/Visita del nuevo día. Reportado prod 2026-05-28.
        let activa = !!parsed.activa;
        let iniciadaEn = parsed.iniciadaEn ?? null;
        let terminadaEn = parsed.terminadaEn ?? null;
        let motivoStop = parsed.motivoStop ?? null;
        if (activa && iniciadaEn) {
          const inicioDay = new Date(iniciadaEn).toDateString();
          const hoyDay = new Date().toDateString();
          if (inicioDay !== hoyDay) {
            activa = false;
            terminadaEn = iniciadaEn;
            iniciadaEn = null;
            motivoStop = 'horario';
          }
        }

        set({
          activa,
          iniciadaEn,
          terminadaEn,
          motivoStop,
          hidratada: true,
        });

        // Persist the day-rollover reset so el siguiente lanzamiento no repita
        // la operación. Best-effort — si falla, hidratada=true ya está aplicado.
        if (activa !== !!parsed.activa) {
          await persist({ activa, iniciadaEn, terminadaEn, motivoStop });
        }
        return;
      }
    } catch { /* ignore */ }
    set({ hidratada: true });
  },

  iniciarJornada: async (motivo) => {
    // Atomic guard via set(updater) — solo el primer caller en el batch
    // sincrónico atraviesa, los demás ven activa=true y retornan.
    // Antes: `if (get().activa) return; set({activa:true})` permitía race
    // entre dos callers en el mismo tick (ej: ruta accept + venta confirm
    // simultáneos) generando ping InicioJornada duplicado.
    let acquired = false;
    const ahora = Date.now();
    set(state => {
      if (state.activa) return state;
      acquired = true;
      return { ...state, activa: true, iniciadaEn: ahora, terminadaEn: null, motivoStop: null };
    });
    if (!acquired) return;
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

    // Mec 1 — Programar notif local a hora_fin del tenant. Sobrevive
    // app cerrada (OS dispara aunque proceso esté muerto). Si vendedor
    // ignora la notif, el watcher useHorarioLaboralWatcher lo cierra al
    // siguiente foreground; si tampoco fue, useInactividadJornadaWatcher
    // (4h sin pings) es la última red de seguridad.
    try {
      const notifs = await import('@/services/jornadaNotifications');
      await notifs.scheduleHorarioFinNotification();
    } catch {
      // ignore — notif no es crítica
    }
  },

  finalizarJornada: async (motivo) => {
    // Mismo pattern atomic guard que iniciarJornada para evitar race entre
    // watchers (horario + inactividad + ruta) que pueden disparar el cierre
    // simultáneamente.
    let acquired = false;
    const ahora = Date.now();
    set(state => {
      if (!state.activa) return state;
      acquired = true;
      return { ...state, activa: false, iniciadaEn: null, terminadaEn: ahora, motivoStop: motivo };
    });
    if (!acquired) return;
    await persist({ activa: false, iniciadaEn: null, terminadaEn: ahora, motivoStop: motivo });

    // Si el vendedor cerró jornada MANUALMENTE y hay una ruta `EnProgreso`,
    // también la completamos en backend + emitimos ping FinRuta. La intención
    // implícita de "Cerrar jornada" es terminar todo el flujo del día.
    // Reportado prod 2026-05-26 (Rodrigo): ruta quedaba EnProgreso huérfana.
    let rutaCerradaServerId: number | null = null;
    if (motivo === 'manual') {
      try {
        const { Q } = await import('@nozbe/watermelondb');
        const { database } = await import('@/db/database');
        const { default: Ruta } = await import('@/db/models/Ruta');
        const { useAuthStore } = await import('./authStore');
        const userId = Number(useAuthStore.getState().user?.id ?? 0);
        if (userId) {
          // estado = 1 (EnProgreso). server_id puede ser null si la ruta
          // todavía no se sincronizó — en ese caso saltamos completar.
          const rutas = await database.get<any>('rutas')
            .query(
              Q.where('usuario_id', userId),
              Q.where('activo', true),
              Q.where('estado', 1),
            )
            .fetch();
          const ruta = rutas[0];
          if (ruta?.serverId) {
            rutaCerradaServerId = Number(ruta.serverId);
            const { rutasApi } = await import('@/api/routes');
            await rutasApi.completar(rutaCerradaServerId).catch(() => {
              // Best-effort: si red caída, el ping FinRuta abajo deja
              // rastro y un cron de reconciliación backend podría cerrar
              // la ruta orfana (follow-up).
              rutaCerradaServerId = null;
            });
          }
        }
      } catch {
        // ignore — no romper el cierre de jornada por error en cerrar ruta
      }
    }

    try {
      const mod = await import('@/services/locationCheckpoint');
      // Si motivo='manual' y cerramos una ruta arriba, emitimos AMBOS pings:
      // FinRuta (cierre de ruta) + FinJornada (cierre de jornada del vendedor).
      // Para motivos automáticos seguimos el mapeo original.
      if (motivo === 'manual' && rutaCerradaServerId != null) {
        await mod.recordPing(mod.TipoPing.FinRuta, rutaCerradaServerId);
      }
      const tipo =
        motivo === 'ruta' ? mod.TipoPing.FinRuta
        : motivo === 'horario' || motivo === 'inactividad' ? mod.TipoPing.StopAutomatico
        : mod.TipoPing.FinJornada;
      await mod.recordPing(tipo);
      // Stop timer al final — el ping de cierre todavía necesita el timer
      // activo (currentUsuarioId queda null si paramos antes del ping).
      mod.stopCheckpointTimer();
    } catch {
      // ignore
    }

    // Cancelar notifs locales pendientes (Mec 1 + Mec 4) ya que la jornada
    // está cerrada. Si no, el vendedor recibiría "¿Ya terminaste?" cuando
    // ya cerró.
    try {
      const notifs = await import('@/services/jornadaNotifications');
      await notifs.cancelAllJornadaNotifications();
    } catch {
      // ignore
    }
  },

  _reset: () => {
    set({ activa: false, iniciadaEn: null, terminadaEn: null, motivoStop: null, hidratada: true });
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },
}));
