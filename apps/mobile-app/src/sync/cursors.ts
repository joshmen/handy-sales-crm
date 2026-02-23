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
    AsyncStorage.setItem(`${PREFIX}lastPulledAt`, String(timestamp));
  },

  getLastSyncAt(): number | null {
    const val = _cache[`${PREFIX}lastSyncAt`];
    return val ? Number(val) : null;
  },

  setLastSyncAt(timestamp: number): void {
    _cache[`${PREFIX}lastSyncAt`] = String(timestamp);
    AsyncStorage.setItem(`${PREFIX}lastSyncAt`, String(timestamp));
  },

  isSyncInProgress(): boolean {
    return _cache[`${PREFIX}syncInProgress`] === 'true';
  },

  setSyncInProgress(inProgress: boolean): void {
    _cache[`${PREFIX}syncInProgress`] = String(inProgress);
    AsyncStorage.setItem(`${PREFIX}syncInProgress`, String(inProgress));
  },

  clear(): void {
    const keys = [
      `${PREFIX}lastPulledAt`,
      `${PREFIX}lastSyncAt`,
      `${PREFIX}syncInProgress`,
    ];
    keys.forEach((k) => delete _cache[k]);
    AsyncStorage.multiRemove(keys);
  },
};
