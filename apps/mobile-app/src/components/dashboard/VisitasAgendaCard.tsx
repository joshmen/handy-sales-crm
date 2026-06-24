import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MapPin, CheckCircle, Clock } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useOfflineScheduledVisits } from '@/hooks/useOfflineScheduledVisits';
import { useOfflineTodayVisits } from '@/hooks/useOfflineVisits';
import { useClientInfoMap } from '@/hooks/useClientNameMap';
import { useCheckInFlow } from '@/hooks/useCheckInFlow';
import { useTenantLocale } from '@/hooks/useTenantLocale';
import type Visita from '@/db/models/Visita';
import { COLORS } from '@/theme/colors';

type RowStatus = 'agendada' | 'en_curso' | 'completada';

interface AgendaRow {
  visita: Visita;
  status: RowStatus;
  isPendiente: boolean;
}

/**
 * Card "VISITAS DE HOY" del dashboard del vendedor. Combina:
 *  - `useOfflineScheduledVisits`: visitas agendadas hoy SIN check-in (pendientes).
 *  - `useOfflineTodayVisits`: visitas con check-in hoy (ya visitadas).
 *
 * Dedupe por id de visita: una visita agendada que ya se cumplió (check-in) aparece
 * en ambos hooks — se muestra UNA sola vez. Orden: pendientes primero (por
 * fecha_programada asc), luego visitadas.
 *
 * Para cada fila resuelve nombre + coords del cliente vía `useClientInfoMap`. Las
 * filas pendientes muestran un botón "Llegué" que dispara `useCheckInFlow.startCheckIn`
 * (requiere coords; sin coords el botón se deshabilita). El dedup de
 * `createVisitaOffline` hace que el check-in CUMPLA la visita agendada sin duplicar.
 *
 * Si no hay visitas hoy, no renderiza nada (no satura el dashboard).
 */
export function VisitasAgendaCard() {
  const { time } = useTenantLocale();
  const { startCheckIn, checkInPanel } = useCheckInFlow();

  const { data: scheduled } = useOfflineScheduledVisits();
  const { data: visited } = useOfflineTodayVisits();

  // Dedupe por id de visita: pendientes primero (asc por fecha_programada), luego
  // visitadas (las que ya tienen check-in). Una visita agendada cumplida sale en
  // ambos sets; el id ya presente (desde pendientes) NO se vuelve a agregar.
  const rows = useMemo<AgendaRow[]>(() => {
    const seen = new Set<string>();
    const result: AgendaRow[] = [];

    // Pendientes: sin check-in (el hook ya filtra y ordena por fecha_programada asc).
    (scheduled ?? []).forEach((v) => {
      if (seen.has(v.id)) return;
      seen.add(v.id);
      result.push({ visita: v, status: 'agendada', isPendiente: true });
    });

    // Visitadas hoy: con check-in. Las que ya estaban como pendientes (raro: una
    // agendada sin check-in NO aparece aquí) se saltan por el Set.
    (visited ?? []).forEach((v) => {
      if (seen.has(v.id)) return;
      seen.add(v.id);
      const status: RowStatus = v.checkOutAt != null ? 'completada' : 'en_curso';
      result.push({ visita: v, status, isPendiente: false });
    });

    return result;
  }, [scheduled, visited]);

  // Resolver nombre + coords de cada cliente por id local (reactivo).
  const clienteIds = useMemo(
    () => Array.from(new Set(rows.map((r) => r.visita.clienteId))),
    [rows]
  );
  const clientInfo = useClientInfoMap(clienteIds);

  const pendientesCount = useMemo(
    () => rows.filter((r) => r.isPendiente).length,
    [rows]
  );

  // Sin visitas hoy: no renderizar nada (no saturar el dashboard).
  if (rows.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(320).duration(400)}>
      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>VISITAS DE HOY</Text>
        {pendientesCount > 0 && (
          <Text style={styles.sectionCount}>
            ({pendientesCount} pendiente{pendientesCount === 1 ? '' : 's'})
          </Text>
        )}
      </View>

      <View style={styles.card}>
        {rows.map((row, index) => {
          const info = clientInfo.get(row.visita.clienteId);
          const nombre = info?.nombre ?? 'Cliente';
          const hasCoords = info?.latitud != null && info?.longitud != null;
          const fecha = row.visita.fechaProgramada ?? row.visita.checkInAt;

          return (
            <View
              key={row.visita.id}
              style={[styles.row, index < rows.length - 1 && styles.rowDivider]}
            >
              <View style={styles.rowInfo}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {nombre}
                </Text>
                <View style={styles.rowMeta}>
                  {fecha && (
                    <View style={styles.rowMetaItem}>
                      <Clock size={12} color="#94a3b8" />
                      <Text style={styles.rowTime}>{time(fecha)}</Text>
                    </View>
                  )}
                  <StatusBadge status={row.status} />
                </View>
              </View>

              {row.isPendiente ? (
                <TouchableOpacity
                  style={[styles.checkInBtn, !hasCoords && styles.checkInBtnDisabled]}
                  onPress={() =>
                    hasCoords &&
                    startCheckIn({
                      clienteId: row.visita.clienteId,
                      clienteServerId: info?.serverId ?? row.visita.clienteServerId,
                      clienteNombre: nombre,
                      latitude: info!.latitud as number,
                      longitude: info!.longitud as number,
                    })
                  }
                  activeOpacity={hasCoords ? 0.85 : 1}
                  disabled={!hasCoords}
                  accessibilityRole="button"
                  accessibilityLabel={`Hacer check-in de la visita a ${nombre}`}
                  accessibilityState={{ disabled: !hasCoords }}
                >
                  <MapPin size={15} color={hasCoords ? '#ffffff' : '#94a3b8'} />
                  <Text style={[styles.checkInText, !hasCoords && styles.checkInTextDisabled]}>
                    {hasCoords ? 'Llegué' : 'Sin ubicación'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <CheckCircle
                  size={20}
                  color={row.status === 'completada' ? COLORS.success : '#0284c7'}
                />
              )}
            </View>
          );
        })}
      </View>

      {/* Overlay del CheckInPanel — se monta al tocar "Llegué". */}
      {checkInPanel}
    </Animated.View>
  );
}

function StatusBadge({ status }: { status: RowStatus }) {
  if (status === 'completada') {
    return (
      <View style={[styles.badge, styles.badgeCompletada]}>
        <Text style={[styles.badgeText, styles.badgeTextCompletada]}>Completada</Text>
      </View>
    );
  }
  if (status === 'en_curso') {
    return (
      <View style={[styles.badge, styles.badgeEnCurso]}>
        <Text style={[styles.badgeText, styles.badgeTextEnCurso]}>En curso</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, styles.badgeAgendada]}>
      <Text style={[styles.badgeText, styles.badgeTextAgendada]}>Agendada</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
    marginBottom: 10,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '600', color: COLORS.foreground },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  rowMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rowTime: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badgeAgendada: { backgroundColor: '#e0f2fe' },
  badgeTextAgendada: { color: '#0284c7' },
  badgeEnCurso: { backgroundColor: '#fef3c7' },
  badgeTextEnCurso: { color: '#b45309' },
  badgeCompletada: { backgroundColor: '#dcfce7' },
  badgeTextCompletada: { color: '#16a34a' },
  checkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#0284c7',
  },
  checkInBtnDisabled: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  checkInText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  checkInTextDisabled: { color: '#94a3b8' },
});
