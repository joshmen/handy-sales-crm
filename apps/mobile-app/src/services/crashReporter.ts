import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '@/utils/constants';
import { useAuthStore } from '@/stores';
import { getAccessToken } from '@/api/client';

const QUEUE_KEY = '@crash_reports_queue';

// SECURITY (audit MED): redactar PII antes de enviar stacks. RN traces a
// veces incluyen string args inline del frame que falló (ej: TypeError en
// `setEmail("user@example.com")` puede salir con el email en el frame).
// También paths file:// que apuntan al sandbox del device.
const PII_PATTERNS: Array<[RegExp, string]> = [
  // Email
  [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '<email>'],
  // Phone-like (10-15 dígitos consecutivos, opcional + prefix)
  [/\+?\d{10,15}\b/g, '<phone>'],
  // RFC mexicano (4 letras + 6 dígitos + 3 alfanum)
  [/\b[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}\b/g, '<rfc>'],
  // file:// paths absolutos (revelan layout del sandbox)
  [/file:\/\/[^\s"')]+/g, '<file-path>'],
  // /data/data/<package>/... paths (Android internal)
  [/\/data\/data\/[^\s"')]+/g, '<android-path>'],
];

function redactPII(text: string | undefined): string | undefined {
  if (!text) return text;
  let result = text;
  for (const [pattern, replacement] of PII_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

interface CrashReportPayload {
  errorMessage: string;
  stackTrace?: string;
  deviceId: string;
  deviceName: string;
  appVersion: string;
  osVersion: string;
  componentName?: string;
  severity: string;
  // tenantId/userId YA NO se mandan desde el cliente — el backend los
  // toma del JWT (VULN-M01 fix). Se dejan en la interface por compat con
  // queue cargado de versiones previas pero no se setean en nuevos reports.
  tenantId?: number;
  userId?: number;
}

export type CrashSeverity = 'CRASH' | 'ERROR' | 'WARNING' | 'INFO';

/**
 * Envia un crash report al servidor.
 * Fire-and-forget — nunca lanza excepciones.
 */
async function reportCrash(
  error: Error | string,
  componentName?: string,
  severity: CrashSeverity = 'ERROR'
): Promise<void> {
  try {
    // user no se usa para tenantId/userId (server toma del JWT) — queda
    // por compat de la queue, pero nuevos reports no setean esos campos.
    void useAuthStore.getState().user;
    const errorMessage = typeof error === 'string' ? error : error.message;
    const stackTrace = typeof error === 'string' ? undefined : error.stack;

    const payload: CrashReportPayload = {
      errorMessage: redactPII(errorMessage)?.substring(0, 2000) || 'Unknown error',
      stackTrace: redactPII(stackTrace)?.substring(0, 10000),
      deviceId: Device.modelId || Device.modelName || 'unknown',
      deviceName: `${Device.brand || ''} ${Device.modelName || ''}`.trim() || 'unknown',
      appVersion: Application.nativeApplicationVersion || '1.0.0',
      osVersion: `${Platform.OS} ${Platform.Version}`,
      componentName,
      severity,
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
      const stackTrace = typeof error === 'string' ? undefined : error.stack;
      await enqueueReport({
        errorMessage: redactPII(errorMessage)?.substring(0, 2000) || 'Unknown error',
        stackTrace: redactPII(stackTrace)?.substring(0, 10000),
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

/**
 * Reporta un evento de telemetria (no crash). Pipea por el mismo pipeline
 * que reportCrash con severity='INFO' para reutilizar:
 *   - PII redaction (VULN-M01 fix)
 *   - Offline queue 50 entries
 *   - JWT-based tenant/user attribution
 *   - Backend persiste a CrashReport table (filtrable por severity='INFO')
 *
 * Usar SOLO en transiciones discretas (no on-keystroke) para no saturar
 * rate-limit 'crash-reports'. Eventos canónicos snake_case ASCII.
 *
 * Ej: await crashReporter.reportEvent('restore_database_initiated', {
 *   pendingCount: 0, source: 'mas_menu',
 * });
 */
async function reportEvent(
  eventName: string,
  props?: Record<string, string | number | boolean>
): Promise<void> {
  // Pipea como CrashReport con severity='INFO'. El backend distingue por
  // severity y loguea a LogLevel.Information (no Error).
  const propsJson = props ? JSON.stringify(props).substring(0, 10000) : undefined;
  // Construir un Error fake para reusar el path tipico (stackTrace = propsJson).
  // reportCrash trata error.message como errorMessage y error.stack como stackTrace.
  const fakeError = new Error(eventName);
  if (propsJson) {
    fakeError.stack = propsJson;
  }
  await reportCrash(fakeError, 'event', 'INFO');
}

export const crashReporter = {
  reportCrash,
  reportEvent,
  flushPendingReports,
};
