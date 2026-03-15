import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '@/utils/constants';
import { useAuthStore } from '@/stores';
import { getAccessToken } from '@/api/client';

const QUEUE_KEY = '@crash_reports_queue';

interface CrashReportPayload {
  errorMessage: string;
  stackTrace?: string;
  deviceId: string;
  deviceName: string;
  appVersion: string;
  osVersion: string;
  componentName?: string;
  severity: string;
  tenantId?: number;
  userId?: number;
}

/**
 * Envia un crash report al servidor.
 * Fire-and-forget — nunca lanza excepciones.
 */
async function reportCrash(
  error: Error | string,
  componentName?: string,
  severity: 'CRASH' | 'ERROR' | 'WARNING' = 'ERROR'
): Promise<void> {
  try {
    const user = useAuthStore.getState().user;
    const errorMessage = typeof error === 'string' ? error : error.message;
    const stackTrace = typeof error === 'string' ? undefined : error.stack;

    const payload: CrashReportPayload = {
      errorMessage: errorMessage?.substring(0, 2000) || 'Unknown error',
      stackTrace: stackTrace?.substring(0, 10000),
      deviceId: Device.modelId || Device.modelName || 'unknown',
      deviceName: `${Device.brand || ''} ${Device.modelName || ''}`.trim() || 'unknown',
      appVersion: Application.nativeApplicationVersion || '1.0.0',
      osVersion: `${Platform.OS} ${Platform.Version}`,
      componentName,
      severity,
      tenantId: user?.tenantId ? Number(user.tenantId) : undefined,
      userId: user?.id ? Number(user.id) : undefined,
    };

    const token = getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_CONFIG.BASE_URL}/api/crash-reports`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      await enqueueReport(payload);
    }
  } catch {
    try {
      const errorMessage = typeof error === 'string' ? error : error.message;
      await enqueueReport({
        errorMessage: errorMessage?.substring(0, 2000) || 'Unknown error',
        stackTrace: typeof error === 'string' ? undefined : error.stack?.substring(0, 10000),
        deviceId: 'unknown',
        deviceName: 'unknown',
        appVersion: Application.nativeApplicationVersion || '1.0.0',
        osVersion: `${Platform.OS} ${Platform.Version}`,
        componentName,
        severity,
      });
    } catch {
      // Absolutamente nada — no podemos fallar aquí
    }
  }
}

async function enqueueReport(payload: CrashReportPayload): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(QUEUE_KEY);
    const queue: CrashReportPayload[] = existing ? JSON.parse(existing) : [];
    if (queue.length < 50) {
      queue.push(payload);
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }
  } catch {
    // Silencioso
  }
}

/**
 * Envía reports pendientes (llamar desde syncEngine o al reconectar).
 */
async function flushPendingReports(): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(QUEUE_KEY);
    if (!existing) return;

    const queue: CrashReportPayload[] = JSON.parse(existing);
    if (queue.length === 0) return;

    const token = getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const remaining: CrashReportPayload[] = [];

    for (const payload of queue) {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/crash-reports`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          remaining.push(payload);
        }
      } catch {
        remaining.push(payload);
        break;
      }
    }

    if (remaining.length > 0) {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    } else {
      await AsyncStorage.removeItem(QUEUE_KEY);
    }
  } catch {
    // Silencioso
  }
}

export const crashReporter = {
  reportCrash,
  flushPendingReports,
};
