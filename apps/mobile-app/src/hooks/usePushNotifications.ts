import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import type { EventSubscription } from 'expo-modules-core';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores';
import {
  registerForPushNotifications,
  registerTokenWithServer,
  getDeepLinkFromNotification,
} from '@/services/pushNotifications';
import { notificationStore } from '@/services/notificationStore';
import { performSync } from '@/sync/syncEngine';

const isExpoGo = Constants.appOwnership === 'expo';

/** Invalidate React Query caches relevant to the notification type. */
function invalidateCachesForType(queryClient: ReturnType<typeof useQueryClient>, type: string) {
  if (type.startsWith('order.')) {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['order'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['pedidos'] });
  } else if (type.startsWith('cobro.')) {
    queryClient.invalidateQueries({ queryKey: ['cobros'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  } else if (type.startsWith('stock.')) {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['producto'] });
  } else if (type.startsWith('invoice.')) {
    queryClient.invalidateQueries({ queryKey: ['facturas'] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  } else if (type.startsWith('goal.')) {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  } else if (type.startsWith('user.') || type.startsWith('profile.')) {
    // Cambio de avatar/nombre/role del propio usuario o de un equipo: refresca
    // el snapshot `me` para que el avatar/badge en el header se vea al instante.
    queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  } else if (type.startsWith('route.')) {
    // Ruta asignada/cancelada/cerrada: invalidar React Query y disparar sync
    // general (trae nueva ruta + sus pedidos + carga a WDB). Pantalla "Hoy"
    // es observable de WDB → se actualiza sin pull cuando llega data nueva.
    // Fallback en caso que SignalR esté caído (ver useRealtime.ts RutaAssigned).
    queryClient.invalidateQueries({ queryKey: ['rutas'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    performSync().catch(() => { /* sync best-effort */ });
  } else {
    // For any other type, at least refresh the dashboard
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }
}

/** Persist notification content to the local store.
 *
 * Si el push viene del backend con `notificationHistoryId`, usamos ese id
 * — así el sync incremental dedupea contra el push live (caller puede
 * llamar también `notificationStore.add` con el mismo id sin duplicar).
 */
function persistNotification(notification: any) {
  const content = notification?.request?.content;
  const data = content?.data;
  if (!content) return;

  const nhId = data?.notificationHistoryId;

  notificationStore.add({
    id: nhId ? String(nhId) : undefined,
    title: content.title ?? 'Notificación',
    body: content.body ?? '',
    type: data?.type ?? 'unknown',
    entityId: data?.entityId,
  }).catch(() => {
    // Silently ignore storage write errors
  });
}

export function usePushNotifications() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const notificationListener = useRef<EventSubscription | undefined>(undefined);
  const responseListener = useRef<EventSubscription | undefined>(undefined);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Push notifications (remote y locales) están deshabilitados en Expo Go
    // desde SDK 53+. Importar el módulo dispara un warning permanente, así que
    // saltamos toda la inicialización aquí — solo corre en dev/release builds.
    if (isExpoGo) return;

    const Notifications = require('expo-notifications');

    registerForPushNotifications().then((token: string | null) => {
      if (token) {
        registerTokenWithServer(token);
      }
    });

    // Handle notifications received while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification: any) => {
        const data = notification.request.content.data;
        const type: string = data?.type ?? '';

        // Persist to local notification history
        persistNotification(notification);

        // Security: force logout if session/device was revoked
        if (type === 'security.device_revoked' || type === 'security.session_revoked') {
          Alert.alert(
            'Sesión Cerrada',
            'Tu sesión fue cerrada por un administrador.',
            [{ text: 'Aceptar', onPress: () => {
              useAuthStore.getState().logout();
              router.replace('/(auth)/login' as any);
            }}],
          );
          return;
        }

        // Trigger background sync for data freshness on any notification
        performSync().catch(() => {});

        // Invalidate relevant React Query caches
        if (type) {
          invalidateCachesForType(queryClient, type);
        }
      });

    // Handle notification tap (app in background or killed)
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response: any) => {
        const notification = response.notification;
        const data = notification?.request?.content?.data;
        const type: string = data?.type ?? '';

        // Persist to local notification history
        persistNotification(notification);

        // Security: force logout if session/device was revoked
        if (type === 'security.device_revoked' || type === 'security.session_revoked') {
          Alert.alert(
            'Sesión Cerrada',
            'Tu sesión fue cerrada por un administrador.',
            [{ text: 'Aceptar', onPress: () => {
              useAuthStore.getState().logout();
              router.replace('/(auth)/login' as any);
            }}],
          );
          return;
        }

        const deepLink = getDeepLinkFromNotification(notification);
        if (deepLink && deepLink.startsWith('/(')) {
          router.push(deepLink as any);
        }
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isAuthenticated, queryClient, router]);
}
