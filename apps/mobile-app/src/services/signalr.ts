import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  HttpTransportType,
  LogLevel,
  type ILogger,
} from '@microsoft/signalr';
import { API_CONFIG } from '@/utils/constants';
import { getAccessToken } from '@/api/client';

type Handler = (...args: unknown[]) => void;

/**
 * Logger silencioso. La app es offline-first y SignalR loguea por console.error
 * cosas como "WebSocket closed 1006" cada vez que pierde red — son eventos
 * normales, no errores accionables. En prod no mostramos nada; en DEV solo
 * info crítica como warnings (no errors).
 */
const silentLogger: ILogger = {
  log(level, message) {
    if (!__DEV__) return;
    if (level >= LogLevel.Warning) {
      // eslint-disable-next-line no-console
      console.warn('[SignalR]', message);
    }
  },
};

class SignalRClient {
  private connection: HubConnection | null = null;
  private subscribers = new Map<string, Set<Handler>>();
  private dispatchers = new Set<string>();
  private starting = false;
  private stateListeners = new Set<(state: HubConnectionState) => void>();
  private currentToken: string | null = null;

  /** Inicia o reutiliza la conexión. No-op si ya está conectado con el mismo token. */
  async start(): Promise<void> {
    const token = getAccessToken();
    if (!token) return;

    // Si la conexión vigente usa el token actual, no hacer nada.
    if (this.connection && this.connection.state === HubConnectionState.Connected && this.currentToken === token) {
      return;
    }
    if (this.starting) return;
    this.starting = true;

    try {
      // Cierra conexión anterior si existe (token rotó).
      if (this.connection) {
        try { await this.connection.stop(); } catch { /* ignore */ }
        this.connection = null;
        this.dispatchers.clear();
      }

      const url = `${API_CONFIG.MAIN_BASE_URL}/hubs/notifications`;
      // En React Native fetch/EventSource no replican el comportamiento que SignalR
      // espera durante negotiate. Forzamos WebSockets (RN tiene WebSocket nativo)
      // y saltamos negotiate — patrón validado por la comunidad para RN/Expo.
      const conn = new HubConnectionBuilder()
        .withUrl(url, {
          accessTokenFactory: () => getAccessToken() ?? '',
          transport: HttpTransportType.WebSockets,
          skipNegotiation: true,
        })
        .withAutomaticReconnect([0, 2000, 5000, 10_000, 30_000])
        .configureLogging(silentLogger)
        .build();

      conn.onreconnecting(() => this.notifyState(HubConnectionState.Reconnecting));
      conn.onreconnected(() => {
        this.bindAllDispatchers();
        this.notifyState(HubConnectionState.Connected);
      });
      conn.onclose(() => this.notifyState(HubConnectionState.Disconnected));

      this.connection = conn;
      this.currentToken = token;

      await conn.start();
      this.bindAllDispatchers();
      this.notifyState(HubConnectionState.Connected);
    } catch (e) {
      if (__DEV__) console.warn('[SignalR] start failed:', e);
      this.connection = null;
      this.currentToken = null;
    } finally {
      this.starting = false;
    }
  }

  async stop(): Promise<void> {
    const conn = this.connection;
    this.connection = null;
    this.currentToken = null;
    this.dispatchers.clear();
    if (conn) {
      try { await conn.stop(); } catch { /* ignore */ }
      this.notifyState(HubConnectionState.Disconnected);
    }
  }

  /** Suscribe a un evento. Devuelve función para desuscribir. */
  on(event: string, handler: Handler): () => void {
    let set = this.subscribers.get(event);
    if (!set) {
      set = new Set();
      this.subscribers.set(event, set);
    }
    set.add(handler);
    this.ensureDispatcher(event);
    return () => this.off(event, handler);
  }

  off(event: string, handler: Handler): void {
    this.subscribers.get(event)?.delete(handler);
  }

  /** Devuelve estado actual + permite suscribirse a cambios. */
  getState(): HubConnectionState {
    return this.connection?.state ?? HubConnectionState.Disconnected;
  }

  onStateChange(listener: (state: HubConnectionState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private notifyState(state: HubConnectionState): void {
    this.stateListeners.forEach((l) => {
      try { l(state); } catch { /* ignore */ }
    });
  }

  private ensureDispatcher(event: string): void {
    const conn = this.connection;
    if (!conn || this.dispatchers.has(event)) return;
    conn.on(event, (...args: unknown[]) => {
      this.subscribers.get(event)?.forEach((h) => {
        try { h(...args); } catch (e) { if (__DEV__) console.warn(`[SignalR] handler error (${event}):`, e); }
      });
    });
    this.dispatchers.add(event);
  }

  private bindAllDispatchers(): void {
    this.subscribers.forEach((_, event) => this.ensureDispatcher(event));
  }
}

export const signalR = new SignalRClient();
export { HubConnectionState };
