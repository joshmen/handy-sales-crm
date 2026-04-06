import { create } from 'zustand';
import { performSync } from '@/sync/syncEngine';
import { syncCursors } from '@/sync/cursors';
import type { SyncSummary } from '@/sync/syncEngine';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';
let _statusTimeout: ReturnType<typeof setTimeout> | null = null;

interface SyncState {
  status: SyncStatus;
  lastSyncAt: number | null;
  lastSummary: SyncSummary | null;
  error: string | null;

  sync: () => Promise<void>;
  reset: () => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: 'idle',
  lastSyncAt: null,
  lastSummary: null,
  error: null,

  sync: async () => {
    if (get().status === 'syncing') return;

    set({ status: 'syncing', error: null });

    try {
      await performSync({
        onStart: () => set({ status: 'syncing' }),
        onFinish: (summary) => {
          const now = Date.now();
          set({ status: 'success', lastSyncAt: now, lastSummary: summary, error: null });
          if (_statusTimeout) clearTimeout(_statusTimeout);
          _statusTimeout = setTimeout(() => {
            _statusTimeout = null;
            if (get().status === 'success') set({ status: 'idle' });
          }, 3000);
        },
        onError: (err) => {
          set({ status: 'error', error: err.message });
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de sincronización';
      set({ status: 'error', error: msg });
    }
  },

  reset: () => {
    syncCursors.clear();
    set({ status: 'idle', lastSyncAt: null, lastSummary: null, error: null });
  },
}));

// Initialize cursors asynchronously and hydrate the store once loaded
syncCursors.init().then(() => {
  useSyncStore.setState({
    lastSyncAt: syncCursors.getLastSyncAt(),
    lastSummary: syncCursors.getLastSyncSummary(),
  });
});
