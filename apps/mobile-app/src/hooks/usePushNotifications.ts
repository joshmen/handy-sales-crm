import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import type { EventSubscription } from 'expo-modules-core';
import { useAuthStore } from '@/stores';
import {
  registerForPushNotifications,
  registerTokenWithServer,
  getDeepLinkFromNotification,
} from '@/services/pushNotifications';
import { performSync } from '@/sync/syncEngine';

const isExpoGo = Constants.appOwnership === 'expo';

export function usePushNotifications() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const notificationListener = useRef<EventSubscription | undefined>(undefined);
  const responseListener = useRef<EventSubscription | undefined>(undefined);

  useEffect(() => {
    if (!isAuthenticated || isExpoGo) return;

    // Lazy import to avoid side-effect crash in Expo Go
    const Notifications = require('expo-notifications');

    // Register for push and send token to server
    registerForPushNotifications().then((token: string | null) => {
      if (token) {
        registerTokenWithServer(token);
      }
    });

    // Handle notifications received while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification: any) => {
        const data = notification.request.content.data;

        // If sync.required, trigger background sync
        if (data?.type === 'sync.required') {
          performSync().catch(() => {});
        }
      });

    // Handle notification tap (app in background or killed)
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response: any) => {
        const deepLink = getDeepLinkFromNotification(
          response.notification
        );
        if (deepLink) {
          router.push(deepLink as any);
        }
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isAuthenticated]);
}
