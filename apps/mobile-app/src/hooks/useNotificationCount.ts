import { useState, useEffect, useCallback, useRef } from 'react';
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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const c = await notificationStore.getUnreadCount();
      setCount(c);
    } catch (e) {
      // Silently ignore storage errors
      if (__DEV__) console.warn('[NotifCount]', e);
    }
  }, []);

  useEffect(() => {
    // Initial read
    refresh();

    // Poll periodically
    intervalRef.current = setInterval(refresh, POLL_INTERVAL_MS);

    // Refresh when app comes to foreground
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') refresh();
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      subscription.remove();
    };
  }, [refresh]);

  return { count, refresh };
}
