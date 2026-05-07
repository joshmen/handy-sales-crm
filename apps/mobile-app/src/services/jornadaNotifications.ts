/**
 * Local notifications para gestión de cierre de jornada.
 * 100% client-side — cero costo server.
 *
 * Mecanismos:
 *   1. `scheduleHorarioFinNotification` — al iniciar jornada, programa notif
 *      local que dispara a la `hora_fin_jornada` del tenant. Sobrevive
 *      app cerrada (OS dispara la notif aunque el proceso esté muerto).
 *   2. `rescheduleInactividadNotification` — después de cada Venta/Cobro/
 *      Visita, programa notif para 2h después. Si pasan 2h sin actividad
 *      de negocio, vendedor recibe prompt "¿Sigues en ruta?".
 *
 * Las notifs incluyen action buttons:
 *   - "Cerrar jornada" → abre app + dispara `finalizarJornada`
 *   - "Sigo trabajando" → reschedule (caso inactividad) o no-op (horario fin)
 *
 * El listener de tap está en `app/_layout.tsx` que maneja las respuestas.
 *
 * Edge cases:
 *  - Sin config de horario laboral → notif Mec 1 no se programa.
 *  - hora_fin ya pasó hoy → notif Mec 1 dispararía mañana (calendar
 *    trigger asume "next occurrence").
 *  - Mec 4 no se programa si el trigger caería después de hora_fin (Mec 1
 *    lo cubre).
 *  - Vendedor desinstala app → notifs programadas se borran (siguiente
 *    iniciarJornada las reschedule).
 *  - Vendedor desactiva permiso de notifs → notifs no aparecen pero las
 *    funciones no-op silently. Watchers existentes (`useHorarioLaboralWatcher`,
 *    `useInactividadJornadaWatcher`) siguen siendo red de seguridad.
 */
import * as Notifications from 'expo-notifications';
import { getEmpresaConfigSnapshot } from '@/utils/empresaConfigSnapshot';

const NOTIF_ID_HORARIO_FIN = 'jornada-horario-fin';
const NOTIF_ID_INACTIVIDAD = 'jornada-inactividad';
const INACTIVIDAD_THRESHOLD_HOURS = 2;

export const NOTIF_CATEGORY_JORNADA = 'JORNADA_END';
export const NOTIF_ACTION_CERRAR = 'cerrar';
export const NOTIF_ACTION_EXTENDER = 'extender';

/**
 * Setup categoría con action buttons. Llamar una vez al boot del app
 * (desde `_layout.tsx`).
 */
export async function setupJornadaNotificationCategory(): Promise<void> {
  try {
    await Notifications.setNotificationCategoryAsync(NOTIF_CATEGORY_JORNADA, [
      {
        identifier: NOTIF_ACTION_CERRAR,
        buttonTitle: 'Cerrar jornada',
        options: { opensAppToForeground: true },
      },
      {
        identifier: NOTIF_ACTION_EXTENDER,
        buttonTitle: 'Sigo trabajando',
        options: { opensAppToForeground: false },
      },
    ]);
  } catch {
    // En Expo Go (SDK 53+) las notif categories pueden fallar — fallback
    // al tap default sin botones. Funciona, solo pierde la opción "extender".
  }
}

/**
 * MEC 1 — Programa notif para la `hora_fin_jornada` del tenant.
 * Llamar desde `iniciarJornada` (jornadaStore).
 *
 * Trigger calendar: dispara a la próxima vez que se cumpla hora:minuto
 * en TZ del device. Asume que vendedor está en la misma TZ del tenant
 * (caso 99% — vendedor de Jeyma usa app en Mazatlán).
 */
export async function scheduleHorarioFinNotification(): Promise<void> {
  const snapshot = getEmpresaConfigSnapshot();
  const horaFin = snapshot?.horaFinJornada;
  if (!horaFin) return; // sin config de horario → vendedor controla manual

  await cancelHorarioFinNotification();

  const parts = horaFin.split(':');
  const hour = parseInt(parts[0] ?? '', 10);
  const minute = parseInt(parts[1] ?? '0', 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return;

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_ID_HORARIO_FIN,
      content: {
        title: '¿Ya terminaste tu día?',
        body: 'Tu jornada se cerrará automáticamente al fin del horario laboral.',
        data: { action: 'jornada-close-prompt', source: 'horario' },
        categoryIdentifier: NOTIF_CATEGORY_JORNADA,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour,
        minute,
        repeats: false,
      } as Notifications.CalendarTriggerInput,
    });
  } catch {
    // ignore — notif falló (permiso, modo no soportado en Expo Go, etc.)
  }
}

export async function cancelHorarioFinNotification(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_HORARIO_FIN);
  } catch {
    // identifier no existe → no-op
  }
}

/**
 * MEC 4 — Programa notif de inactividad para 2h en el futuro.
 * Llamar después de cada Venta/Cobro/Visita confirmada (en
 * `recordPing` o desde el caller).
 *
 * No programa si el trigger caería después de `hora_fin_jornada` —
 * en ese caso Mec 1 ya cubre el cierre.
 */
export async function rescheduleInactividadNotification(): Promise<void> {
  await cancelInactividadNotification();

  const inactividadSec = INACTIVIDAD_THRESHOLD_HOURS * 60 * 60;

  // Si trigger caería después de hora_fin del tenant, NO programar
  // (Mec 1 lo agarra antes). Evita spam doble.
  const snapshot = getEmpresaConfigSnapshot();
  const horaFin = snapshot?.horaFinJornada;
  if (horaFin) {
    const parts = horaFin.split(':');
    const horaFinH = parseInt(parts[0] ?? '', 10);
    const horaFinM = parseInt(parts[1] ?? '0', 10);
    if (!Number.isNaN(horaFinH)) {
      const now = new Date();
      const triggerTime = now.getTime() + inactividadSec * 1000;
      const horaFinTime = new Date(now);
      horaFinTime.setHours(horaFinH, horaFinM, 0, 0);
      if (triggerTime >= horaFinTime.getTime()) return;
    }
  }

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_ID_INACTIVIDAD,
      content: {
        title: '¿Sigues en ruta?',
        body: `Llevas ${INACTIVIDAD_THRESHOLD_HOURS}h sin venta, cobro ni visita.`,
        data: { action: 'jornada-close-prompt', source: 'inactividad' },
        categoryIdentifier: NOTIF_CATEGORY_JORNADA,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: inactividadSec,
        repeats: false,
      } as Notifications.TimeIntervalTriggerInput,
    });
  } catch {
    // ignore
  }
}

export async function cancelInactividadNotification(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_INACTIVIDAD);
  } catch {
    // no-op si no existe
  }
}

/** Cancela ambos al `finalizarJornada`. */
export async function cancelAllJornadaNotifications(): Promise<void> {
  await Promise.all([
    cancelHorarioFinNotification(),
    cancelInactividadNotification(),
  ]);
}
