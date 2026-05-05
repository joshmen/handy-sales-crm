import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/api/client';
import { notificationStore } from './notificationStore';

const LAST_SYNC_KEY = '@notifications:lastSync';

interface BackendNotification {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: string;
  data?: string | null; // JSON serialized
  enviadoEn?: string | null;
  leidoEn?: string | null;
}

/**
 * Sincroniza el histórico de notificaciones desde el backend al store
 * local. Diseñado para ser llamado:
 *  1. Al login / abrir la app (recupera lo que el push live no entregó).
 *  2. En pull-to-refresh de la pantalla notificaciones.
 *  3. Como step opcional en el sync general.
 *
 * Dedup: el backend incluye `notificationHistoryId` como id; el store
 * usa ese id como clave. Si el push live ya guardó la notificación
 * (mismo id), `notificationStore.add` la trata como idempotente y no
 * la duplica ni resetea su read state local.
 *
 * No-throw: cualquier error se loggea y retorna 0. El sync es best-effort.
 */
export async function syncNotificationsFromBackend(): Promise<number> {
  try {
    const since = await AsyncStorage.getItem(LAST_SYNC_KEY);
    const path = since
      ? `/api/mobile/notifications?since=${encodeURIComponent(since)}`
      : '/api/mobile/notifications';

    const res = await api.get<BackendNotification[]>(path);
    const items = Array.isArray(res.data) ? res.data : [];

    let added = 0;
    for (const n of items) {
      const id = String(n.id);
      const existing = await notificationStore.findById(id);
      if (existing) continue;

      const dataParsed = parseDataJson(n.data);
      await notificationStore.add({
        id,
        title: n.titulo,
        body: n.mensaje,
        type: dataParsed?.type ?? n.tipo ?? 'unknown',
        entityId: dataParsed?.entityId,
        receivedAt: n.enviadoEn ?? new Date().toISOString(),
      });
      added++;
    }

    // Avanza el cursor solo si todo el fetch fue exitoso, para que un
    // crash en medio re-intente el batch completo en la próxima corrida.
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

    if (__DEV__ && added > 0) {
      console.log(`[notificationSync] added ${added} notifications from backend`);
    }
    return added;
  } catch (e) {
    if (__DEV__) console.warn('[notificationSync] failed:', e);
    return 0;
  }
}

function parseDataJson(raw: string | null | undefined): Record<string, any> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
