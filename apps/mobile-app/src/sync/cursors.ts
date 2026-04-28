import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@sync:';

// In-memory cache for fast synchronous reads
let _cache: Record<string, string> = {};
let _loaded = false;

async function ensureLoaded() {
  if (_loaded) return;
  const keys = [
    `${PREFIX}lastPulledAt`,
    `${PREFIX}lastSyncAt`,
    `${PREFIX}syncInProgress`,
  ];
  const pairs = await AsyncStorage.multiGet(keys);
  for (const [key, value] of pairs) {
    if (value !== null) _cache[key] = value;
  }
  _loaded = true;
}

export const syncCursors = {
  async init() {
    await ensureLoaded();
  },

  getLastPulledAt(): number | null {
    const val = _cache[`${PREFIX}lastPulledAt`];
    return val ? Number(val) : null;
  },

  setLastPulledAt(timestamp: number): void {
    _cache[`${PREFIX}lastPulledAt`] = String(timestamp);
    AsyncStorage.setItem(`${PREFIX}lastPulledAt`, String(timestamp)).catch(() => {});
  },

  getLastSyncAt(): number | null {
    const val = _cache[`${PREFIX}lastSyncAt`];
    return val ? Number(val) : null;
  },

  setLastSyncAt(timestamp: number): void {
    _cache[`${PREFIX}lastSyncAt`] = String(timestamp);
    AsyncStorage.setItem(`${PREFIX}lastSyncAt`, String(timestamp)).catch(() => {});
  },

  isSyncInProgress(): boolean {
    return _cache[`${PREFIX}syncInProgress`] === 'true';
  },

  setSyncInProgress(inProgress: boolean): void {
    _cache[`${PREFIX}syncInProgress`] = String(inProgress);
    AsyncStorage.setItem(`${PREFIX}syncInProgress`, String(inProgress)).catch(() => {});
  },

  getLastSyncSummary(): { pulled: number; pushed: number; conflicts: number } | null {
    const val = _cache[`${PREFIX}lastSyncSummary`];
    if (!val) return null;
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  },

  setLastSyncSummary(summary: { pulled: number; pushed: number; conflicts: number }): void {
    const json = JSON.stringify(summary);
    _cache[`${PREFIX}lastSyncSummary`] = json;
    AsyncStorage.setItem(`${PREFIX}lastSyncSummary`, json).catch(() => {});
  },

  /**
   * Persiste atómicamente lastSyncAt + summary al final del sync. Usar al final
   * de performSync — `await` lo asegura que los writes terminen antes de que
   * cualquier logout/clear posterior los pueda interrumpir (race window).
   */
  async commitSyncResult(summary: { pulled: number; pushed: number; conflicts: number }): Promise<void> {
    const now = Date.now();
    const json = JSON.stringify(summary);
    _cache[`${PREFIX}lastSyncAt`] = String(now);
    _cache[`${PREFIX}lastSyncSummary`] = json;
    await AsyncStorage.multiSet([
      [`${PREFIX}lastSyncAt`, String(now)],
      [`${PREFIX}lastSyncSummary`, json],
    ]);
  },

  clear(): void {
    const keys = [
      `${PREFIX}lastPulledAt`,
      `${PREFIX}lastSyncAt`,
      `${PREFIX}syncInProgress`,
      `${PREFIX}lastSyncSummary`,
    ];
    keys.forEach((k) => delete _cache[k]);
    AsyncStorage.multiRemove(keys).catch(() => {});
  },
};
