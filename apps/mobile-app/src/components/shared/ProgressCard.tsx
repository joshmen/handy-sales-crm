import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/theme/colors';

/**
 * Card de progreso para paradas/pedidos/productos. Si la categoría no
 * tiene elementos (`total === 0`), renderiza una versión gris con
 * caption explicativo en vez de "0/0 (NaN%)" — más informativo que
 * ocultar y menos engañoso que mostrar 100%.
 *
 * Owner UX 2026-05-05. Usado por:
 * - app/(tabs)/ruta/index.tsx (detalle de ruta)
 * - components/dashboard/VendedorDashboard.tsx (home)
 */
export interface ProgressCardProps {
  label: string;
  current: number;
  total: number;
  color: string;
  emptyCaption: string;
}

export default function ProgressCard({
  label,
  current,
  total,
  color,
  emptyCaption,
}: ProgressCardProps) {
  const isEmpty = total === 0;
  const pct = isEmpty ? 0 : Math.min(100, (current / total) * 100);
  const fillColor = isEmpty ? '#cbd5e1' : color;
  const labelColor = isEmpty ? COLORS.textSecondary : COLORS.foreground;
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.count, { color: labelColor }]}>
          {isEmpty ? '—' : `${current} / ${total}`}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${pct}%`, backgroundColor: fillColor },
            isEmpty && styles.trackEmpty,
          ]}
        />
      </View>
      {isEmpty && <Text style={styles.emptyCaption}>{emptyCaption}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  count: {
    fontSize: 12,
    fontWeight: '700',
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  trackEmpty: {
    opacity: 0.6,
  },
  emptyCaption: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
