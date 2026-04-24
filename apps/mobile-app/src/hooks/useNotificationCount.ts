import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { notificationStore } from '@/services/notificationStore';

const POLL_INTERVAL_MS = 10_000; // 10 seconds

/**
 * Hook that tracks unread notification count.
 * Polls AsyncStorage periodically and refreshes on app foreground.
 * Call `refresh()` to force an immediate re-read (e.g., after saving a notification).
 */
export function useUnreadNotificationCount() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const c = await notificationStore.getUnreadCount();
      setCount(c);
    } catch (e) {
      if (__DEV__) console.warn('[NotifCount]', e);
    }
  }, []);

  useEffect(() => {
    refresh();

    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') refresh();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [refresh]);

  return { count, refresh };
}
