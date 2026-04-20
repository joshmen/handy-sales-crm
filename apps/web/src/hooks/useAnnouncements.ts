'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSignalR } from '@/contexts/SignalRContext';
import { getActiveBanners, dismissBanner, AnnouncementBanner } from '@/services/api/announcements';

// Polling intervals (ms). SignalR push is the source of truth for new banners;
// polling is a heavy safety net only for silent WS drops.
const POLL_NO_WS = 60_000;       // 60s when no WebSocket
const POLL_WS = 5 * 60_000;       // 5min when SignalR connected
const POLL_BACKGROUND = 0;        // No polling when tab hidden

export function useAnnouncements() {
  const { status } = useSession();
  const { isConnected, on, off } = useSignalR();
  const [banners, setBanners] = useState<AnnouncementBanner[]>([]);
  const [loading, setLoading] = useState(false);

  const pollInterval = isConnected ? POLL_WS : POLL_NO_WS;

  const fetchBanners = useCallback(async () => {
    if (status !== 'authenticated') return;
    try {
      setLoading(true);
      const data = await getActiveBanners();
      setBanners(data);
    } catch {
      // Silently fail - banners are non-critical
    } finally {
      setLoading(false);
    }
  }, [status]);

  // --- SignalR push: instant banner updates (no extra HTTP calls) ---
  useEffect(() => {
    if (!isConnected) return;

    const handleCreated = (...args: unknown[]) => {
      // Handle both camelCase and PascalCase
      const raw = args[0] as Record<string, unknown> | undefined;
      const id = (raw?.id ?? raw?.Id) as number | undefined;
      const titulo = (raw?.titulo ?? raw?.Titulo) as string | undefined;
      const mensaje = (raw?.mensaje ?? raw?.Mensaje) as string | undefined;
      const tipo = (raw?.tipo ?? raw?.Tipo) as string | undefined;
      const prioridad = (raw?.prioridad ?? raw?.Prioridad) as string | undefined;
      const displayMode = (raw?.displayMode ?? raw?.DisplayMode) as string | undefined;
      const isDismissible = (raw?.isDismissible ?? raw?.IsDismissible) as boolean | undefined;
      const expiresAt = (raw?.expiresAt ?? raw?.ExpiresAt) as string | null | undefined;

      // Only add to banners if DisplayMode includes Banner (Banner or Both)
      const mode = displayMode ?? 'Banner';
      if (mode === 'Notification') return; // notification-only, skip banner list

      if (id) {
        // Build banner directly from SignalR payload — instant, no API call
        const newBanner: AnnouncementBanner = {
          id,
          titulo: titulo ?? '',
          mensaje: mensaje ?? '',
          tipo: (tipo as AnnouncementBanner['tipo']) ?? 'Banner',
          prioridad: (prioridad as AnnouncementBanner['prioridad']) ?? 'Normal',
          displayMode: (mode as AnnouncementBanner['displayMode']) ?? 'Banner',
          isDismissible: isDismissible ?? true,
          expiresAt: expiresAt ?? null,
          dataJson: null,
        };
        setBanners(prev => {
          if (prev.some(b => b.id === newBanner.id)) return prev; // dedupe
          return [newBanner, ...prev];
        });
      } else {
        // Incomplete payload — fallback to API fetch
        fetchBanners();
      }
    };

    const handleExpired = (...args: unknown[]) => {
      const raw = args[0] as Record<string, unknown> | undefined;
      const id = (raw?.id ?? raw?.Id) as number | undefined;
      if (id) {
        setBanners(prev => prev.filter(b => b.id !== id));
      }
    };

    const handleMaintenanceChanged = (...args: unknown[]) => {
      const payload = args[0] as { active?: boolean } | undefined;
      if (payload?.active === false) {
        // Deactivation — AnnouncementExpired events will remove individual banners,
        // but refetch as safety net to catch anything missed
        fetchBanners();
      }
      // active=true is handled by the AnnouncementCreated event that fires alongside it
    };

    on('AnnouncementCreated', handleCreated);
    on('AnnouncementExpired', handleExpired);
    on('MaintenanceModeChanged', handleMaintenanceChanged);
    return () => {
      off('AnnouncementCreated', handleCreated);
      off('AnnouncementExpired', handleExpired);
      off('MaintenanceModeChanged', handleMaintenanceChanged);
    };
  }, [isConnected, on, off, fetchBanners]);

  // Initial fetch + safety-net polling (paused when tab hidden)
  useEffect(() => {
    if (status !== 'authenticated') return;

    fetchBanners();

    let intervalId: ReturnType<typeof setInterval> | null = null;
    const startPolling = (delay: number) => {
      if (intervalId) clearInterval(intervalId);
      if (delay > 0) intervalId = setInterval(fetchBanners, delay);
    };

    startPolling(pollInterval);

    const onVisibility = () => {
      if (document.hidden) {
        startPolling(POLL_BACKGROUND);
      } else {
        fetchBanners(); // catch-up immediately on return
        startPolling(pollInterval);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [status, fetchBanners, pollInterval]);

  // Catch-up on SignalR reconnect — covers silent WS drops
  useEffect(() => {
    if (isConnected && status === 'authenticated') {
      fetchBanners();
    }
  }, [isConnected, status, fetchBanners]);

  const handleDismiss = useCallback(async (id: number) => {
    try {
      await dismissBanner(id);
      setBanners(prev => prev.filter(b => b.id !== id));
    } catch {
      // Silently fail
    }
  }, []);

  return { banners, loading, dismiss: handleDismiss, refresh: fetchBanners };
}
