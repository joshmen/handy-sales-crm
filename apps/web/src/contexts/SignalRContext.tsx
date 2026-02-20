'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

interface SignalRContextType {
  isConnected: boolean;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
}

const SignalRContext = createContext<SignalRContextType>({
  isConnected: false,
  on: () => {},
  off: () => {},
});

export const useSignalR = () => useContext(SignalRContext);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1050';

/**
 * SignalR provider with subscriber registry pattern.
 *
 * Instead of registering handlers directly on the HubConnection (which can
 * lose handlers due to race conditions when the connection isn't ready yet),
 * we keep an internal registry of subscribers. ONE dispatcher per event name
 * is registered on the HubConnection, and it fans out to all subscribers.
 *
 * This ensures handlers survive connection changes and are never lost.
 */
export function SignalRProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const connectionRef = useRef<HubConnection | null>(null);
  const tokenRef = useRef<string | undefined>(undefined);

  // Registry: event name → Set of subscriber handlers
  const subscribersRef = useRef(new Map<string, Set<(...args: unknown[]) => void>>());
  // Track which event dispatchers are registered on the current connection
  const dispatchersRef = useRef(new Set<string>());

  // Register dispatchers for all known events on a connection
  const bindDispatchers = useCallback((conn: HubConnection) => {
    subscribersRef.current.forEach((_, event) => {
      if (!dispatchersRef.current.has(event)) {
        conn.on(event, (...args: unknown[]) => {
          console.log(`[SignalR] << ${event}`, args[0]);
          subscribersRef.current.get(event)?.forEach(handler => {
            try { handler(...args); } catch (e) { console.error(`[SignalR] handler error (${event}):`, e); }
          });
        });
        dispatchersRef.current.add(event);
      }
    });
  }, []);

  // Ensure a dispatcher exists for a given event on the current connection
  const ensureDispatcher = useCallback((event: string) => {
    const conn = connectionRef.current;
    if (!conn || dispatchersRef.current.has(event)) return;

    conn.on(event, (...args: unknown[]) => {
      console.log(`[SignalR] << ${event}`, args[0]);
      subscribersRef.current.get(event)?.forEach(handler => {
        try { handler(...args); } catch (e) { console.error(`[SignalR] handler error (${event}):`, e); }
      });
    });
    dispatchersRef.current.add(event);
  }, []);

  // Build and start connection when we have a valid token
  useEffect(() => {
    if (status !== 'authenticated' || !session?.accessToken) return;

    // Skip mock tokens (dev mode without backend)
    if (session.accessToken.startsWith('mock-')) return;

    // If token hasn't changed and we already have a connection, skip
    if (tokenRef.current === session.accessToken && connectionRef.current) return;
    tokenRef.current = session.accessToken;

    // Stop existing connection before creating a new one
    const oldConnection = connectionRef.current;
    if (oldConnection) {
      oldConnection.stop().catch(() => {});
      connectionRef.current = null;
      dispatchersRef.current.clear();
      setIsConnected(false);
    }

    const hubUrl = `${API_URL}/hubs/notifications`;
    const token = session.accessToken;

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

    connection.onreconnecting(() => {
      console.log('[SignalR] Reconnecting...');
      setIsConnected(false);
    });

    connection.onreconnected(() => {
      console.log('[SignalR] Reconnected');
      setIsConnected(true);
    });

    connection.onclose(() => {
      console.log('[SignalR] Connection closed');
      setIsConnected(false);
    });

    connectionRef.current = connection;

    // Register dispatchers for any events that consumers already subscribed to
    // BEFORE starting the connection (handlers registered on HubConnection
    // persist through reconnections automatically)
    bindDispatchers(connection);

    connection
      .start()
      .then(() => {
        console.log('[SignalR] Connected to', hubUrl);
        setIsConnected(true);
      })
      .catch((err) => {
        console.error('[SignalR] Connection failed:', err);
        setIsConnected(false);
      });

    return () => {
      connection.stop().catch(() => {});
      connectionRef.current = null;
      dispatchersRef.current.clear();
      setIsConnected(false);
    };
  }, [status, session?.accessToken, bindDispatchers]);

  // Subscribe: add handler to registry + ensure dispatcher exists
  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    if (!subscribersRef.current.has(event)) {
      subscribersRef.current.set(event, new Set());
    }
    subscribersRef.current.get(event)!.add(handler);
    ensureDispatcher(event);
  }, [ensureDispatcher]);

  // Unsubscribe: remove handler from registry (dispatcher stays — it's cheap)
  const off = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    subscribersRef.current.get(event)?.delete(handler);
  }, []);

  return (
    <SignalRContext.Provider value={{ isConnected, on, off }}>
      {children}
    </SignalRContext.Provider>
  );
}
