import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Play, Square, Clock, AlertCircle } from 'lucide-react-native';
import { useJornadaStore } from '@/stores';
import { useEmpresa } from '@/hooks/useEmpresa';
import { COLORS } from '@/theme/colors';
import { useTenantLocale } from '@/hooks/useTenantLocale';

/**
 * Card en home para que el vendedor inicie/finalice su jornada laboral.
 *
 * - Jornada inactiva normal: card verde grande "Iniciar jornada" (primary).
 *   Si admin configuró horario y NO estamos en él, muestra chip informativo
 *   pero el botón sigue habilitado (override manual).
 *
 * - Jornada inactiva por cierre automático de horario (motivoStop='horario'):
 *   banner amarillo "Tu jornada cerró a las HH:mm. ¿Sigues trabajando?" con
 *   botón "Reanudar". Útil cuando el vendedor sigue en la calle a hora extra
 *   y queremos avisarle que su tracking se cortó. Si solo sigue vendiendo sin
 *   presionar Reanudar, el auto-start implícito de recordPing(Venta|Cobro|
 *   Visita) reabre la jornada igual.
 *
 * - Jornada activa: card outline con dot verde + "Jornada activa desde HH:mm"
 *   y botón "Finalizar".
 *
 * Si el vendedor tiene ruta EnProgreso, NO mostramos esta card porque la ruta
 * es el primary action y useRutaJornadaWatcher gestiona el estado.
 */
interface Props {
  hideForActiveRoute?: boolean;
}

export function JornadaCard({ hideForActiveRoute }: Props) {
  const activa = useJornadaStore(s => s.activa);
  const iniciadaEn = useJornadaStore(s => s.iniciadaEn);
  const motivoStop = useJornadaStore(s => s.motivoStop);
  const iniciarJornada = useJornadaStore(s => s.iniciarJornada);
  const finalizarJornada = useJornadaStore(s => s.finalizarJornada);
  const { time } = useTenantLocale();
  const { data: empresa } = useEmpresa();

  if (hideForActiveRoute) return null;

  const horaInicio = empresa?.horaInicioJornada;
  const horaFin = empresa?.horaFinJornada;
  const fueraHorario = horaInicio && horaFin && !enHorarioLaboral(horaInicio, horaFin);

  // Variante: jornada cerrada automáticamente por horario laboral.
  if (!activa && motivoStop === 'horario') {
    return (
      <View style={styles.wrapper}>
        <View style={styles.autoStopBanner}>
          <View style={styles.autoStopIconBox}>
            <AlertCircle size={20} color="#b45309" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.autoStopTitle}>Jornada cerrada automáticamente</Text>
            <Text style={styles.autoStopSubtitle}>
              Tu jornada terminó al salir del horario laboral{horaFin ? ` (${horaFin})` : ''}. ¿Sigues trabajando?
            </Text>
            <View style={styles.autoStopButtonRow}>
              <TouchableOpacity
                style={styles.resumeButton}
                activeOpacity={0.85}
                onPress={() => iniciarJornada('manual')}
                accessibilityRole="button"
                accessibilityLabel="Reanudar jornada"
              >
                <Play size={14} color="#ffffff" fill="#ffffff" />
                <Text style={styles.resumeButtonText}>Reanudar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (!activa) {
    return (
      <View style={styles.wrapper}>
        <TouchableOpacity
          style={styles.startCard}
          activeOpacity={0.85}
          onPress={() => iniciarJornada('manual')}
          accessibilityRole="button"
          accessibilityLabel="Iniciar jornada"
        >
          <View style={styles.iconCircleStart}>
            <Play size={20} color="#ffffff" fill="#ffffff" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.startTitle}>Iniciar jornada</Text>
            <Text style={styles.startSubtitle}>
              Tu ubicación se registra solo mientras tu jornada esté activa
            </Text>
            {fueraHorario && (
              <View style={styles.warningChip}>
                <Clock size={12} color="#b45309" />
                <Text style={styles.warningChipText}>
                  Fuera del horario laboral ({horaInicio}–{horaFin})
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.activeCard}>
        <View style={styles.activeRow}>
          <View style={styles.dotPulse} />
          <View style={{ flex: 1 }}>
            <Text style={styles.activeTitle}>Jornada activa</Text>
            {iniciadaEn && (
              <Text style={styles.activeSubtitle}>Desde {time(new Date(iniciadaEn))}</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.stopButton}
            activeOpacity={0.85}
            onPress={() => finalizarJornada('manual')}
            accessibilityRole="button"
            accessibilityLabel="Finalizar jornada"
          >
            <Square size={14} color={COLORS.foreground} fill={COLORS.foreground} />
            <Text style={styles.stopButtonText}>Finalizar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function enHorarioLaboral(horaInicio: string, horaFin: string): boolean {
  const ahora = new Date();
  const min = ahora.getHours() * 60 + ahora.getMinutes();
  const [hi, mi] = horaInicio.split(':').map(n => parseInt(n, 10));
  const [hf, mf] = horaFin.split(':').map(n => parseInt(n, 10));
  const inicio = (hi || 0) * 60 + (mi || 0);
  const fin = (hf || 0) * 60 + (mf || 0);
  return min >= inicio && min < fin;
}

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: 16, marginBottom: 16 },
  startCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  iconCircleStart: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: { flex: 1 },
  startTitle: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  startSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  warningChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  warningChipText: { color: '#b45309', fontSize: 11, fontWeight: '600' },
  autoStopBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef3c7',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  autoStopIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fde68a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  autoStopTitle: { color: '#78350f', fontSize: 15, fontWeight: '700' },
  autoStopSubtitle: { color: '#92400e', fontSize: 12, marginTop: 2, lineHeight: 16 },
  autoStopButtonRow: { flexDirection: 'row', marginTop: 10 },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  resumeButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  activeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dotPulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#16a34a',
  },
  activeTitle: { color: COLORS.foreground, fontSize: 14, fontWeight: '700' },
  activeSubtitle: { color: COLORS.textSecondary, fontSize: 12 },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  stopButtonText: { color: COLORS.foreground, fontSize: 13, fontWeight: '600' },
});
