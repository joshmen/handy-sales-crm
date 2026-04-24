import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { api } from '@/api/client';

const isExpoGo = Constants.appOwnership === 'expo';

// Lazy-load expo-notifications to avoid side-effect crash in Expo Go (SDK 53+)
function getNotificationsModule() {
  return require('expo-notifications') as typeof import('expo-notifications');
}

// Configure how notifications are presented when app is in foreground
if (!isExpoGo) {
  const Notifications = getNotificationsModule();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications require a dev build — skip entirely in Expo Go
  if (isExpoGo) {
    console.log('[Push] Skipping — push notifications not supported in Expo Go (SDK 53+)');
    return null;
  }

  if (!Device.isDevice) {
    console.log('[Push] Must use physical device for push notifications');
    return null;
  }

  const Notifications = getNotificationsModule();

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] Permission not granted');
    return null;
  }

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Handy Suites',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563eb',
    });

    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Pedidos',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('collections', {
      name: 'Cobranza',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('routes', {
      name: 'Rutas',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // Get Expo push token (with fallback per official docs)
  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  if (!projectId) {
    console.log('[Push] No projectId found — configure EAS project first');
    return null;
  }

  let tokenData;
  try {
    tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
  } catch (e) {
    if (__DEV__) console.error('[Push] Failed to get push token:', e);
    return null;
  }

  return tokenData.data;
}

export async function registerTokenWithServer(pushToken: string): Promise<void> {
  try {
    await api.post('/api/mobile/auth/device-token', {
      token: pushToken,
      platform: Platform.OS,
      deviceName: Device.deviceName ?? 'Unknown',
    });
    console.log('[Push] Token registered with server');
  } catch (error) {
    if (__DEV__) console.error('[Push] Failed to register token:', error);
  }
}

export function addNotificationReceivedListener(
  callback: (notification: any) => void
) {
  // Los listeners LOCALES funcionan incluso en Expo Go (solo el PUSH REMOTO está
  // deshabilitado desde SDK 53+). Permitir que se registren para que notifs
  // locales (scheduleNotificationAsync) disparen handlers.
  try {
    const Notifications = getNotificationsModule();
    return Notifications.addNotificationReceivedListener(callback);
  } catch {
    return { remove: () => {} };
  }
}

export function addNotificationResponseListener(
  callback: (response: any) => void
) {
  try {
    const Notifications = getNotificationsModule();
    return Notifications.addNotificationResponseReceivedListener(callback);
  } catch {
    return { remove: () => {} };
  }
}

export async function getBadgeCount(): Promise<number> {
  if (isExpoGo) return 0;
  const Notifications = getNotificationsModule();
  return Notifications.getBadgeCountAsync();
}

export async function setBadgeCount(count: number): Promise<void> {
  if (isExpoGo) return;
  const Notifications = getNotificationsModule();
  await Notifications.setBadgeCountAsync(count);
}

// Parse deep link from notification data
export function getDeepLinkFromNotification(
  notification: any
): string | null {
  const data = notification?.request?.content?.data;
  if (!data) return null;

  const { type, entityId } = data as { type?: string; entityId?: string };
  if (!type) return null;

  // Validate entityId: must be a positive integer string to prevent
  // path traversal / open-redirect via crafted notification payloads.
  const safeEntityId = entityId && /^\d+$/.test(entityId) ? entityId : null;

  switch (type) {
    case 'order.new':       // Legacy — kept for backwards compat with older push payloads
    case 'order.confirmed':
    case 'order.processing': // Legacy — kept for backwards compat with older push payloads
    case 'order.en_route':
    case 'order.delivered':
    case 'order.cancelled':
    case 'order.assigned':
    case 'order.status_changed':
      return safeEntityId ? `/(tabs)/vender/${safeEntityId}` : '/(tabs)/vender';
    case 'cobro.new':
      return safeEntityId ? `/(tabs)/cobrar/detalle-cobro/${safeEntityId}` : '/(tabs)/cobrar';
    case 'stock.low':
      return safeEntityId ? `/(tabs)/vender/producto/${safeEntityId}` : '/(tabs)/vender';
    case 'goal.assigned':
    case 'goal.achieved':
      return '/(tabs)';
    case 'announcement':
      return '/(tabs)/notificaciones';
    case 'security.device_revoked':
    case 'security.session_revoked':
      return null; // Handled separately — forces logout
    case 'route.published':
    case 'visit.reminder':
      return '/(tabs)/ruta';
    case 'invoice.timbrado':
    case 'invoice.created':
      return safeEntityId ? `/(tabs)/vender/${safeEntityId}` : '/(tabs)/vender';
    case 'client.update':
      return safeEntityId ? `/(tabs)/clients/${safeEntityId}` : '/(tabs)/clients';
    case 'inventory.alert':
      return '/(tabs)/inventario';
    case 'sync.required':
      return null; // Triggers sync, no navigation
    default:
      return null;
  }
}
