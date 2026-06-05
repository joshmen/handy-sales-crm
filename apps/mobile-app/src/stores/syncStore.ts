import { create } from 'zustand';
import Toast from 'react-native-toast-message';
import { performSync, type SyncProgress } from '@/sync/syncEngine';
import { syncCursors } from '@/sync/cursors';
import { classifyError, type SyncErrorType } from '@/sync/errorClassifier';
import type { SyncSummary } from '@/sync/syncEngine';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';
let _statusTimeout: ReturnType<typeof setTimeout> | null = null;
// Reliability Fase 2: rastrear ultima transicion para Toast pasivo.
// Solo mostrar Toast cuando hay un cambio real (failure -> success o tras
// retries exhaustos). Sin esto, cada sync exitoso lanzaria Toast spammy.
let _lastShownStatus: SyncStatus | null = null;

interface SyncState {
  status: SyncStatus;
  lastSyncAt: number | null;
  lastSummary: SyncSummary | null;
  error: string | null;
  /**
   * Sprint 1 audit code-quality: tipo clasificado del error actual.
   * UI lo usa para diferenciar feedback (network -> reintento + countdown,
   * auth -> CTA login, server -> wait, client -> contacta soporte).
   */
  errorType: SyncErrorType | null;
  /**
   * Sprint 1 audit code-quality: progreso de sync en curso. Emitido por
   * syncEngine via onProgress callback. Permite mostrar "Enviando X de Y"
   * en el SyncStatusCard. null cuando no hay sync activo.
   */
  progress: SyncProgress | null;
  /**
   * Sprint 1: timestamp del proximo retry programado (cuando esta clasificado
   * como transient). UI lo usa para countdown visible.
   */
  retryingAtMs: number | null;

  sync: () => Promise<void>;
  reset: () => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: 'idle',
  lastSyncAt: null,
  lastSummary: null,
  error: null,
  errorType: null,
  progress: null,
  retryingAtMs: null,

  sync: async () => {
    if (get().status === 'syncing') return;

    set({ status: 'syncing', error: null, errorType: null, progress: null, retryingAtMs: null });

    try {
      await performSync({
        onStart: () => set({ status: 'syncing' }),
        onProgress: (p) => set({ progress: p }),
        onFinish: (summary) => {
          const now = Date.now();
          set({
            status: 'success',
            lastSyncAt: now,
            lastSummary: summary,
            error: null,
            errorType: null,
            progress: null,
            retryingAtMs: null,
          });
          // Reliability Fase 2: Toast pasivo solo en transicion error → success.
          // No spam en cada sync.
          if (_lastShownStatus === 'error' && summary.pushed + summary.pulled > 0) {
            Toast.show({
              type: 'success',
              text1: 'Datos sincronizados',
              text2: 'Los pendientes ya estan en el servidor.',
              visibilityTime: 2500,
              position: 'bottom',
            });
          }
          _lastShownStatus = 'success';
          if (_statusTimeout) clearTimeout(_statusTimeout);
          _statusTimeout = setTimeout(() => {
            _statusTimeout = null;
            if (get().status === 'success') set({ status: 'idle' });
          }, 3000);
        },
        onError: (err) => {
          // Sprint 1 audit: classifyError es ahora la fuente unica de verdad.
          // isOnline desde el net status no esta disponible aqui; clasificamos
          // solo por el mensaje. UI tiene contexto de red para refinar si hace falta.
          const classified = classifyError(err.message, true);
          set({
            status: 'error',
            error: err.message,
            errorType: classified.type,
            progress: null,
            retryingAtMs: classified.isTransient ? Date.now() + 30_000 : null,
          });
          // Reliability Fase 2: Toast solo en transicion (no spam si ya estaba en error).
          if (_lastShownStatus !== 'error') {
            Toast.show({
              type: classified.type === 'network' || classified.type === 'server' ? 'info' : 'error',
              text1: classified.type === 'auth' ? 'Sesion expirada'
                : classified.type === 'network' ? 'Sin conexion'
                : classified.type === 'server' ? 'Servidor no disponible'
                : 'Sincronizacion fallida',
              text2: classified.userMessage,
              visibilityTime: 3500,
              position: 'bottom',
            });
          }
          _lastShownStatus = 'error';
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de sincronización';
      const classified = classifyError(msg, true);
      set({
        status: 'error',
        error: msg,
        errorType: classified.type,
        progress: null,
        retryingAtMs: classified.isTransient ? Date.now() + 30_000 : null,
      });
    }
  },

  reset: () => {
    syncCursors.clear();
    set({
      status: 'idle',
      lastSyncAt: null,
      lastSummary: null,
      error: null,
      errorType: null,
      progress: null,
      retryingAtMs: null,
    });
  },
}));

// Initialize cursors asynchronously and hydrate the store once loaded.
// Catch silently: si SecureStore está corrupto/no disponible, dejamos los
// defaults (lastSyncAt=null) — el primer pull/push del usuario reseteará
// los cursores. No queremos crashear app boot por un error de hydration.
syncCursors.init().then(() => {
  useSyncStore.setState({
    lastSyncAt: syncCursors.getLastSyncAt(),
    lastSummary: syncCursors.getLastSyncSummary(),
  });
}).catch((err) => {
  if (__DEV__) console.warn('[syncStore] cursor init failed:', err);
});
