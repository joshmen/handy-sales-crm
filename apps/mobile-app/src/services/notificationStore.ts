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

export const notificationStore = {
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
    return newItem;
  },

  async markAsRead(id: string): Promise<void> {
    const items = await this.getAll();
    const item = items.find(i => i.id === id);
    if (item) {
      item.read = true;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  },

  async markAllAsRead(): Promise<void> {
    const items = await this.getAll();
    items.forEach(i => { i.read = true; });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  },

  async getUnreadCount(): Promise<number> {
    const items = await this.getAll();
    return items.filter(i => !i.read).length;
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};
