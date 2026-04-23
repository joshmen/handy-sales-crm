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
  } else {
    // For any other type, at least refresh the dashboard
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }
}

/** Persist notification content to the local store. */
function persistNotification(notification: any) {
  const content = notification?.request?.content;
  const data = content?.data;
  if (!content) return;

  notificationStore.add({
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

    // Lazy import to avoid side-effect crash in Expo Go
    const Notifications = require('expo-notifications');

    // Register for push and send token to server — SOLO fuera de Expo Go
    // (remote push removido del Expo Go en SDK 53+). Los listeners de abajo
    // sí se registran SIEMPRE para captar notifs locales en DEV.
    if (!isExpoGo) {
      registerForPushNotifications().then((token: string | null) => {
        if (token) {
          registerTokenWithServer(token);
        }
      });
    }

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
