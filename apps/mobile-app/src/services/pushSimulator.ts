import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

/**
 * Dev-only: programa una notificación LOCAL que imita un push remoto
 * `route.published`. Permite validar handlers/deep-link/aceptación en
 * Expo Go + emulador donde el push remoto no funciona (SDK 53+).
 *
 * Uso: desde Más (pantalla DEV) con la ruta de hoy. En 2s aparece
 * la notificación. Tap → deep link `/(tabs)/ruta` → banner Aceptar.
 */
export async function simulateRoutePublishedPush(rutaServerId: number): Promise<boolean> {
  if (!__DEV__) {
    console.warn('[pushSimulator] solo disponible en DEV');
    return false;
  }

  try {
    // Lazy-load para no crashear el bundle en Expo Go si expo-notifications
    // no está instalado (improbable, pero defensivo — mismo patrón que pushNotifications.ts).
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');

    // Expo Go en SDK 53+: las notificaciones locales SÍ funcionan (solo se bloqueó push remoto).
    // En dev build / APK también funcionan. Así que esto cubre todos los escenarios de prueba.

    // En Expo Go, setNotificationHandler no se ejecutó en pushNotifications.ts
    // (está guardado tras `if (!isExpoGo)`). Configuramos acá solo para simulator.
    if (isExpoGo) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Ruta pendiente de aceptar',
        body: 'Acéptala para comenzar',
        data: { type: 'route.published', entityId: String(rutaServerId) },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
      } as any,
    });

    console.log(`[pushSimulator] notif programada a 2s con entityId=${rutaServerId}`);
    return true;
  } catch (e) {
    console.error('[pushSimulator] error programando notif:', e);
    return false;
  }
}
