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

export const notificationStore = {
  async getAll(): Promise<StoredNotification[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  async add(notification: Omit<StoredNotification, 'id' | 'receivedAt' | 'read'>): Promise<void> {
    const items = await this.getAll();
    const newItem: StoredNotification = {
      ...notification,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      receivedAt: new Date().toISOString(),
      read: false,
    };
    items.unshift(newItem);
    // Keep only the latest MAX_NOTIFICATIONS
    if (items.length > MAX_NOTIFICATIONS) items.length = MAX_NOTIFICATIONS;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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
