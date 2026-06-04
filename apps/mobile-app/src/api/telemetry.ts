import { api } from './client';
import type { ApiResponse } from '@/types';

/**
 * B.2 — Telemetría heartbeat (fix prod 2026-06-03 post-incidente Rodrigo).
 *
 * El cliente postea su estado de sincronización cada 5 min cuando hay red
 * y la app está foreground. El server detecta backlog y alerta supervisores
 * vía /api/admin/sync-health.
 */

export interface HeartbeatPayload {
  deviceId?: string;
  pendingByTable: Record<string, string[]>;
  lastSyncAt: string | null;
  appVersion?: string;
  schemaVersion?: number;
}

export interface HeartbeatAck {
  telemetryId: number;
  receivedAt: string;
  shouldForceSyncPush: boolean;
  message: string | null;
}

class MobileTelemetryApi {
  private basePath = '/api/mobile/telemetry';

  async sendHeartbeat(payload: HeartbeatPayload): Promise<HeartbeatAck> {
    const response = await api.post<ApiResponse<HeartbeatAck>>(
      `${this.basePath}/heartbeat`,
      payload,
    );
    const body = response.data;
    if (!body || body.success === false || !body.data) {
      throw new Error(body?.message || 'Heartbeat fallo');
    }
    return body.data;
  }
}

export const telemetryApi = new MobileTelemetryApi();
