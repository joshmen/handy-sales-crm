import { useRouter } from 'expo-router';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { usePendingCount } from '@/hooks/usePendingCount';
import { useOldestPendingAge } from '@/hooks/useOldestPendingAge';

/**
 * Banner visible cuando hay datos sin subir desde hace > 24h.
 * Tap navega al sync tab para ver detalle + forzar push.
 *
 * Reliability Sprint Fase 2 — visibilidad para el vendedor. Antes el badge
 * en Sync tab solo contaba items pero no indicaba antigüedad. Datos atascados
 * por dias quedaban invisibles hasta el proximo open del sync tab.
 *
 * Colores:
 * - amarillo: > 24h sin subir (recordatorio amable)
 * - rojo: > 72h sin subir (algo está mal, intervención recomendada)
 *
 * No renderiza si no hay datos pendientes o si <24h.
 */
export function PendingDataBanner() {
  const router = useRouter();
  const { data: pendingCount } = usePendingCount();
  const oldestAgeHours = useOldestPendingAge();
  const count = pendingCount ?? 0;

  if (count === 0 || oldestAgeHours === null || oldestAgeHours < 24) {
    return null;
  }

  const isCritical = oldestAgeHours > 72;
  const days = Math.floor(oldestAgeHours / 24);
  const containerStyle = isCritical ? styles.critical : styles.warning;
  const textStyle = isCritical ? styles.criticalText : styles.warningText;

  return (
    <TouchableOpacity
      onPress={() => router.push('/(tabs)/sync' as any)}
      style={[styles.container, containerStyle]}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${count} datos pendientes de sincronizar hace ${days} dias`}
    >
      <AlertTriangle size={18} color={isCritical ? '#dc2626' : '#b45309'} />
      <View style={styles.textWrap}>
        <Text style={[styles.title, textStyle]}>
          {count} {count === 1 ? 'dato sin subir' : 'datos sin subir'}
        </Text>
        <Text style={[styles.subtitle, textStyle]}>
          {isCritical
            ? `Hace ${days} dias. Verifica tu conexion o contacta a soporte.`
            : `Hace ${days} dia${days === 1 ? '' : 's'}. Verifica tu conexion.`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  warning: { backgroundColor: '#fffbeb', borderColor: '#fcd34d' },
  critical: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  textWrap: { flex: 1, gap: 2 },
  title: { fontSize: 13, fontWeight: '700' },
  subtitle: { fontSize: 12 },
  warningText: { color: '#92400e' },
  criticalText: { color: '#991b1b' },
});
