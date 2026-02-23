import { create } from 'zustand';
import { performSync } from '@/sync/syncEngine';
import { syncCursors } from '@/sync/cursors';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface SyncState {
  status: SyncStatus;
  lastSyncAt: number | null;
  error: string | null;
  pendingCount: number;

  sync: () => Promise<void>;
  setPendingCount: (count: number) => void;
  reset: () => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: 'idle',
  lastSyncAt: syncCursors.getLastSyncAt(),
  error: null,
  pendingCount: 0,

  sync: async () => {
    if (get().status === 'syncing') return;

    set({ status: 'syncing', error: null });

    try {
      await performSync({
        onStart: () => set({ status: 'syncing' }),
        onFinish: () => {
          const now = Date.now();
          set({ status: 'success', lastSyncAt: now, error: null });
          // Reset to idle after 3s
          setTimeout(() => {
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

  setPendingCount: (count) => set({ pendingCount: count }),

  reset: () => {
    syncCursors.clear();
    set({ status: 'idle', lastSyncAt: null, error: null, pendingCount: 0 });
  },
}));
