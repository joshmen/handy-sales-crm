'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useSignalR } from '@/contexts/SignalRContext';
import {
  notificationService,
  type NotificationDto,
  type NotificationFilters,
} from '@/services/api/notificationService';

// Polling intervals (ms). Philosophy: SignalR push is the source of truth for
// real-time updates. Polling is a pure safety net for when WS silently drops.
// With a reconnect-driven refetch (see onReconnected effect below), the worst
// case is a user seeing stale state until the next poll tick or reconnect —
// whichever happens first.
const POLL_FOREGROUND_NO_WS = 60_000;     // WS down, tab visible — recover reasonably fast
const POLL_FOREGROUND_WS = 5 * 60_000;    // WS up — heavy safety net only
const BACKGROUND_POLLING_DISABLED = 0;     // Tab hidden: don't poll at all

interface UseNotificationsOptions {
  pollingInterval?: number;
  backgroundInterval?: number;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { data: session } = useSession();
  const { isConnected, on, off } = useSignalR();

  // Compute effective intervals based on WebSocket state.
  // Background (tab hidden) doesn't poll at all — reconnect/visibility triggers handle catch-up.
  const pollingInterval = options.pollingInterval ?? (isConnected ? POLL_FOREGROUND_WS : POLL_FOREGROUND_NO_WS);
  const backgroundInterval = options.backgroundInterval ?? BACKGROUND_POLLING_DISABLED;

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Fetch unread count (lightweight, for badge) ---
  const fetchUnreadCount = useCallback(async () => {
    if (!session?.user) return;
    const res = await notificationService.getUnreadCount();
    if (res.success && res.data !== null) {
      setUnreadCount(res.data);
    }
  }, [session]);

  // --- Fetch full notification list (on demand, for dialog) ---
  const fetchNotifications = useCallback(
    async (filters?: NotificationFilters) => {
      if (!session?.user) return;
      setLoading(true);
      const res = await notificationService.getNotifications(
        filters ?? { pagina: 1, tamanoPagina: 20 }
      );
      if (res.success && res.data) {
        setNotifications(res.data.items);
        setUnreadCount(res.data.noLeidas);
      }
      setLoading(false);
    },
    [session]
  );

  // --- Mark single as read (optimistic update) ---
  const markAsRead = useCallback(
    async (id: number) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, leidoEn: new Date().toISOString() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      const res = await notificationService.markAsRead(id);
      if (!res.success) {
        await fetchNotifications();
      }
    },
    [fetchNotifications]
  );

  // --- Mark all as read ---
  const markAllAsRead = useCallback(async () => {
    const res = await notificationService.markAllAsRead();
    if (res.success) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, leidoEn: n.leidoEn ?? new Date().toISOString() }))
      );
      setUnreadCount(0);
    }
    return res;
  }, []);

  // --- SignalR push: receive real-time notifications ---
  useEffect(() => {
    if (!isConnected) return;

    const handleReceive = (...args: unknown[]) => {
      // Handle both camelCase and PascalCase (SignalR may send either)
      const raw = args[0] as Record<string, unknown> | undefined;
      if (!raw) return;

      const id = (raw.id ?? raw.Id) as number | undefined;

      // Increment badge count
      setUnreadCount((prev) => prev + 1);

      // Prepend to notification list if it's loaded
      setNotifications((prev) => {
        if (prev.length === 0) return prev; // list not loaded yet, skip
        const newNotif: NotificationDto = {
          id: id ?? 0,
          titulo: ((raw.titulo ?? raw.Titulo) as string) ?? '',
          mensaje: ((raw.mensaje ?? raw.Mensaje) as string) ?? '',
          tipo: ((raw.tipo ?? raw.Tipo) as string) ?? 'info',
          status: 'sent',
          leidoEn: undefined,
          creadoEn: new Date().toISOString(),
        };
        return [newNotif, ...prev];
      });
    };

    on('ReceiveNotification', handleReceive);
    return () => off('ReceiveNotification', handleReceive);
  }, [isConnected, on, off]);

  // --- Polling with visibilitychange (heavy safety net only) ---
  useEffect(() => {
    if (!session?.user) return;

    fetchUnreadCount();

    const stopInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const startInterval = (delay: number) => {
      stopInterval();
      if (delay > 0) intervalRef.current = setInterval(fetchUnreadCount, delay);
    };

    startInterval(pollingInterval);

    const onVisibility = () => {
      if (document.hidden) {
        // Tab oculto: dejar de gastar requests. Al volver al tab hacemos catch-up.
        startInterval(backgroundInterval);
      } else {
        // Tab visible: catch-up inmediato + reanudar polling
        fetchUnreadCount();
        startInterval(pollingInterval);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stopInterval();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [session, pollingInterval, backgroundInterval, fetchUnreadCount]);

  // --- Catch-up on SignalR reconnect ---
  // If WS silently dropped and reconnected, we may have missed push events.
  // Do a one-shot refetch to resync state. Cheaper than aggressive polling.
  useEffect(() => {
    if (isConnected && session?.user) {
      fetchUnreadCount();
    }
  }, [isConnected, session, fetchUnreadCount]);

  return {
    unreadCount,
    notifications,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    refetchCount: fetchUnreadCount,
  };
}
