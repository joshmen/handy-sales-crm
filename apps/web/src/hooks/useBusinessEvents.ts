'use client';

import { useEffect, useCallback, useState } from 'react';
import { useSignalR } from '@/contexts/SignalRContext';

export interface SyncEvent {
  userId: number;
  userName: string;
  pulled: number;
  pushed: number;
  pedidosCreados: number;
  cobrosCreados: number;
  visitasCreadas: number;
  clientesCreados: number;
  timestamp: string;
}

export interface BusinessEvent {
  type: 'SyncCompleted' | 'PedidoCreated' | 'CobroRegistrado' | 'VisitaCompletada';
  userId: number;
  userName: string;
  count?: number;
  timestamp: string;
}

interface UseBusinessEventsOptions {
  onSyncCompleted?: (event: SyncEvent) => void;
  onPedidoCreated?: (event: BusinessEvent) => void;
  onCobroRegistrado?: (event: BusinessEvent) => void;
  onVisitaCompletada?: (event: BusinessEvent) => void;
  /** If true, auto-collects recent events into the `events` array */
  collectEvents?: boolean;
  /** Max events to keep in memory (default 50) */
  maxEvents?: number;
}

/**
 * Hook that listens for real-time business events via SignalR.
 * Events are dispatched by the Main API when a mobile device syncs.
 */
export function useBusinessEvents(options: UseBusinessEventsOptions = {}) {
  const { on, off, isConnected } = useSignalR();
  const {
    onSyncCompleted,
    onPedidoCreated,
    onCobroRegistrado,
    onVisitaCompletada,
    collectEvents = false,
    maxEvents = 50,
  } = options;

  const [events, setEvents] = useState<BusinessEvent[]>([]);

  const addEvent = useCallback(
    (event: BusinessEvent) => {
      if (!collectEvents) return;
      setEvents((prev) => [event, ...prev].slice(0, maxEvents));
    },
    [collectEvents, maxEvents]
  );

  useEffect(() => {
    const handleSync = (...args: unknown[]) => {
      const data = args[0] as SyncEvent;
      onSyncCompleted?.(data);
      addEvent({
        type: 'SyncCompleted',
        userId: data.userId,
        userName: data.userName,
        timestamp: data.timestamp,
      });
    };

    const handlePedido = (...args: unknown[]) => {
      const data = args[0] as BusinessEvent;
      onPedidoCreated?.(data);
      addEvent({ ...data, type: 'PedidoCreated' });
    };

    const handleCobro = (...args: unknown[]) => {
      const data = args[0] as BusinessEvent;
      onCobroRegistrado?.(data);
      addEvent({ ...data, type: 'CobroRegistrado' });
    };

    const handleVisita = (...args: unknown[]) => {
      const data = args[0] as BusinessEvent;
      onVisitaCompletada?.(data);
      addEvent({ ...data, type: 'VisitaCompletada' });
    };

    on('SyncCompleted', handleSync);
    on('PedidoCreated', handlePedido);
    on('CobroRegistrado', handleCobro);
    on('VisitaCompletada', handleVisita);

    return () => {
      off('SyncCompleted', handleSync);
      off('PedidoCreated', handlePedido);
      off('CobroRegistrado', handleCobro);
      off('VisitaCompletada', handleVisita);
    };
  }, [on, off, onSyncCompleted, onPedidoCreated, onCobroRegistrado, onVisitaCompletada, addEvent]);

  return { events, isConnected };
}
