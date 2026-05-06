import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@notifications:history';
const MAX_NOTIFICATIONS = 100;

export interface StoredNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  entityId?: string;
  receivedAt: string; // ISO date
  read: boolean;
}

export type AddNotificationInput = Omit<StoredNotification, 'id' | 'receivedAt' | 'read'> & {
  /** Opcional: si se omite, se genera uno local. Cuando viene del push o
   *  del sync incremental, debe usarse el `notificationHistoryId` del
   *  backend para garantizar dedup entre push live y sync. */
  id?: string;
  /** Opcional: si se omite usa now(). El sync pasa `enviadoEn` del backend. */
  receivedAt?: string;
};

// ---------------------------------------------------------------------------
// Reactive subscribe pattern (vanilla, sin Zustand)
//
// Necesario para que la pantalla `notificaciones.tsx` se entere cuando el
// store cambia desde fuera (push live, sync backend, otro tab abierto).
// Antes solo leía en mount → push llegaba pero la lista no actualizaba
// hasta pull-to-refresh.
// ---------------------------------------------------------------------------
type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach(l => {
    try { l(); } catch (e) {
      if (__DEV__) console.warn('[notificationStore] listener threw:', e);
    }
  });
}

export const notificationStore = {
  /** Suscribirse a cambios. Retorna función para des-suscribirse. */
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },

  async getAll(): Promise<StoredNotification[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as StoredNotification[];
    } catch (e) {
      // AsyncStorage corrupto: limpiar y empezar de cero en vez de crashear
      // todos los consumers que llaman getAll() (NotificacionesScreen, badge counter, etc.)
      if (__DEV__) console.warn('[notificationStore] corrupted JSON, resetting:', e);
      await AsyncStorage.removeItem(STORAGE_KEY);
      return [];
    }
  },

  async findById(id: string): Promise<StoredNotification | null> {
    const items = await this.getAll();
    return items.find(i => i.id === id) ?? null;
  },

  /**
   * Agrega o reemplaza una notificación. Dedup por id: si ya existe una con
   * el mismo id, NO se duplica (el caller que da id explícito asume idempotencia).
   * Cuando id no se pasa, se genera uno local nuevo.
   */
  async add(input: AddNotificationInput): Promise<StoredNotification> {
    const items = await this.getAll();
    const id = input.id ?? Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const existing = items.find(i => i.id === id);
    if (existing) {
      // Idempotente: si ya existe, no tocar (preserva read state local).
      return existing;
    }
    const newItem: StoredNotification = {
      id,
      title: input.title,
      body: input.body,
      type: input.type,
      entityId: input.entityId,
      receivedAt: input.receivedAt ?? new Date().toISOString(),
      read: false,
    };
    items.unshift(newItem);
    // Keep only the latest MAX_NOTIFICATIONS
    if (items.length > MAX_NOTIFICATIONS) items.length = MAX_NOTIFICATIONS;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    notify();
    return newItem;
  },

  async markAsRead(id: string): Promise<void> {
    const items = await this.getAll();
    const item = items.find(i => i.id === id);
    if (item && !item.read) {
      item.read = true;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      notify();
    }
  },

  async markAllAsRead(): Promise<void> {
    const items = await this.getAll();
    const hadUnread = items.some(i => !i.read);
    if (!hadUnread) return;
    items.forEach(i => { i.read = true; });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    notify();
  },

  /** Elimina una notificación individual del store local. NO se sincroniza
   *  al backend (la persistencia backend es para "no perder push si app
   *  cerrada"; un delete local solo afecta este device — coherente con
   *  Mail/Slack pattern). */
  async removeById(id: string): Promise<void> {
    const items = await this.getAll();
    const filtered = items.filter(i => i.id !== id);
    if (filtered.length === items.length) return;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    notify();
  },

  async getUnreadCount(): Promise<number> {
    const items = await this.getAll();
    return items.filter(i => !i.read).length;
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
    notify();
  },
};
