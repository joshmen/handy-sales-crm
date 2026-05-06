import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Square, AlertCircle, Play } from 'lucide-react-native';
import { useJornadaStore } from '@/stores';
import { COLORS } from '@/theme/colors';
import { useTenantLocale } from '@/hooks/useTenantLocale';
import { useEmpresa } from '@/hooks/useEmpresa';
import { enHorarioLaboral } from '@/utils/horarioLaboral';

/**
 * Indicador discreto de estado de jornada en home.
 *
 * El inicio de jornada **es 100% automático** — la primera Venta/Cobro/Visita
 * o el aceptar una ruta arrancan el tracking sin necesidad de botón explícito
 * (ver `recordPing` en `services/locationCheckpoint.ts` y `useRutaJornadaWatcher`).
 *
 * Por eso esta card NO muestra un botón "Iniciar jornada". Tres estados visibles:
 *
 * 1. **Jornada inactiva sin cierre por horario reciente** → `null` (oculto).
 *    El home se mantiene limpio. Si el vendedor empieza a vender, se autoinicia
 *    y aparece el chip activo.
 *
 * 2. **Jornada activa** → chip outline con dot verde + "Tracking activo · HH:mm"
 *    + botón "Finalizar". El Finalizar permite parar antes del horario configurado
 *    (ej: vendedor sale temprano).
 *
 * 3. **Jornada cerrada automáticamente por horario hace <4h** → banner amarillo
 *    "Jornada cerrada automáticamente. ¿Sigues trabajando? [Reanudar]" como aviso
 *    de que el tracking se cortó. El vendedor no necesita presionar nada — la
 *    siguiente venta lo reactiva igual; el botón es sólo conveniencia.
 *
 * Si el vendedor tiene ruta EnProgreso, NO renderizamos esta card (la ruta es el
 * primary action y `useRutaJornadaWatcher` gestiona el ciclo completo).
 */
interface Props {
  hideForActiveRoute?: boolean;
}

const AUTO_STOP_BANNER_TTL_MS = 4 * 60 * 60 * 1000; // 4 horas

export function JornadaCard({ hideForActiveRoute }: Props) {
  const activa = useJornadaStore(s => s.activa);
  const iniciadaEn = useJornadaStore(s => s.iniciadaEn);
  const terminadaEn = useJornadaStore(s => s.terminadaEn);
  const motivoStop = useJornadaStore(s => s.motivoStop);
  const iniciarJornada = useJornadaStore(s => s.iniciarJornada);
  const finalizarJornada = useJornadaStore(s => s.finalizarJornada);
  const { time } = useTenantLocale();

  if (hideForActiveRoute) return null;

  // Estado 3: cerrada por horario/inactividad hace <4h → banner Reanudar.
  const cierreReciente = terminadaEn != null && Date.now() - terminadaEn < AUTO_STOP_BANNER_TTL_MS;
  const cierrePorSistema = motivoStop === 'horario' || motivoStop === 'inactividad';
  if (!activa && cierrePorSistema && cierreReciente) {
    const subtitulo = motivoStop === 'inactividad'
      ? 'Tu tracking se detuvo por inactividad. ¿Sigues trabajando?'
      : 'Tu tracking se detuvo al salir del horario laboral. ¿Sigues trabajando?';
    return (
      <View style={styles.wrapper}>
        <ResumeBanner
          subtitulo={subtitulo}
          motivoStop={motivoStop}
          onResume={() => iniciarJornada('manual')}
        />
      </View>
    );
  }

  // Estado 1: inactiva sin cierre reciente → oculto. La primera venta autoiniciará.
  if (!activa) return null;

  // Estado 2: jornada activa → chip outline con botón Finalizar.
  return (
    <View style={styles.wrapper}>
      <View style={styles.activeChip}>
        <View style={styles.dotPulse} />
        <View style={{ flex: 1 }}>
          <Text style={styles.activeTitle}>Tracking activo</Text>
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
          <Square size={12} color={COLORS.foreground} fill={COLORS.foreground} />
          <Text style={styles.stopButtonText}>Finalizar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Banner "Jornada cerrada — ¿Reanudar?" con validación de horario laboral.
 *
 * El botón Reanudar se DESHABILITA si el vendedor está fuera del horario
 * laboral configurado por el admin. Sin este guard, el flujo era:
 *   1. Tap Reanudar → iniciarJornada('manual') abre la jornada local
 *   2. Watcher (cada 60s) detecta fuera de horario → finalizarJornada('horario')
 *   3. Loop sin feedback al user. Reportado 2026-05-05 por vendedor.
 *
 * Re-evalúa cada 60s para que cuando entre el horario laboral, el botón
 * se habilite automáticamente sin recargar la pantalla.
 */
interface ResumeBannerProps {
  subtitulo: string;
  motivoStop: string | null;
  onResume: () => void;
}

function ResumeBanner({ subtitulo, motivoStop, onResume }: ResumeBannerProps) {
  const { data: empresa } = useEmpresa();
  const horaInicio = empresa?.horaInicioJornada;
  const horaFin = empresa?.horaFinJornada;
  const diasLaborables = empresa?.diasLaborables;
  const configActiva = !!(horaInicio || horaFin || diasLaborables);

  // Solo bloquear si está fuera de horario por motivo "horario" — si fue
  // inactividad (motivoStop='inactividad') no aplicamos restricción de tiempo.
  const aplicaRestriccion = motivoStop === 'horario' && configActiva;

  // Re-evaluar cada 60s: si el vendedor está esperando a que entre el horario,
  // el botón se habilita solo cuando llegue la hora de inicio.
  const [enHorario, setEnHorario] = useState(() =>
    aplicaRestriccion ? enHorarioLaboral(horaInicio, horaFin, diasLaborables) : true
  );

  useEffect(() => {
    if (!aplicaRestriccion) {
      setEnHorario(true);
      return;
    }
    setEnHorario(enHorarioLaboral(horaInicio, horaFin, diasLaborables));
    const handle = setInterval(() => {
      setEnHorario(enHorarioLaboral(horaInicio, horaFin, diasLaborables));
    }, 60_000);
    return () => clearInterval(handle);
  }, [aplicaRestriccion, horaInicio, horaFin, diasLaborables]);

  const disabled = !enHorario;
  const formatRange = () => {
    if (!horaInicio || !horaFin) return '';
    return `${horaInicio.slice(0, 5)}–${horaFin.slice(0, 5)}`;
  };
  const formatDias = () => {
    if (!diasLaborables) return '';
    const map: Record<string, string> = { '1': 'L', '2': 'M', '3': 'X', '4': 'J', '5': 'V', '6': 'S', '7': 'D' };
    return diasLaborables.split(',').map(d => map[d.trim()] ?? '').filter(Boolean).join(', ');
  };

  return (
    <View style={styles.autoStopBanner}>
      <View style={styles.autoStopIconBox}>
        <AlertCircle size={20} color="#b45309" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.autoStopTitle}>Jornada cerrada automáticamente</Text>
        <Text style={styles.autoStopSubtitle}>{subtitulo}</Text>
        <View style={styles.autoStopButtonRow}>
          <TouchableOpacity
            style={[styles.resumeButton, disabled && styles.resumeButtonDisabled]}
            activeOpacity={disabled ? 1 : 0.85}
            disabled={disabled}
            onPress={() => !disabled && onResume()}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            accessibilityLabel={disabled ? 'Reanudar jornada (deshabilitado, fuera de horario laboral)' : 'Reanudar jornada'}
          >
            <Play size={14} color="#ffffff" fill="#ffffff" />
            <Text style={styles.resumeButtonText}>Reanudar</Text>
          </TouchableOpacity>
        </View>
        {disabled && (
          <Text style={styles.outsideHoursCaption}>
            Fuera de horario laboral{formatRange() ? ` (${formatRange()}${formatDias() ? `, ${formatDias()}` : ''})` : ''}.
            Contacta a tu administrador para extender el horario.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: 16, marginBottom: 16 },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  dotPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16a34a',
  },
  activeTitle: { color: COLORS.foreground, fontSize: 13, fontWeight: '700' },
  activeSubtitle: { color: COLORS.textSecondary, fontSize: 11, marginTop: 1 },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stopButtonText: { color: COLORS.foreground, fontSize: 12, fontWeight: '600' },
  cardContent: { flex: 1 },
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
  resumeButtonDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.7,
  },
  outsideHoursCaption: {
    color: '#92400e',
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 14,
  },
});
