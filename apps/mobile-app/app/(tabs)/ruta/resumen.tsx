import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVisitsSummary, useRouteToday } from '@/hooks';
import { Card, Button, LoadingSpinner } from '@/components/ui';
import { COLORS } from '@/theme/colors';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function ResumenDiarioScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const visitsSummary = useVisitsSummary();
  const routeToday = useRouteToday();

  const summary = visitsSummary.data;
  const route = routeToday.data;

  if (visitsSummary.isLoading) {
    return <View style={styles.container}><LoadingSpinner message="Cargando resumen..." /></View>;
  }

  const efectividad = summary && summary.totalVisitas > 0
    ? Math.round((summary.visitasCompletadas / summary.totalVisitas) * 100)
    : 0;

  const efectividadColor = efectividad >= 80 ? '#16a34a' : efectividad >= 50 ? '#d97706' : '#ef4444';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Blue Header */}
      <View style={[styles.blueHeader, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.blueHeaderTitle}>Resumen del Día</Text>
      </View>

      {/* Effectiveness Banner */}
      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <View style={[styles.effectivenessBanner, { backgroundColor: `${efectividadColor}10`, borderColor: `${efectividadColor}30` }]}>
          <View style={styles.effectivenessContent}>
            <Text style={styles.effectivenessLabel}>Efectividad del Día</Text>
            <Text style={[styles.effectivenessValue, { color: efectividadColor }]}>{efectividad}%</Text>
          </View>
        </View>
      </Animated.View>

      {/* KPI Grid */}
      <Animated.View entering={FadeInDown.duration(400).delay(200)}>
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{summary?.totalVisitas ?? 0}</Text>
          <Text style={styles.kpiLabel}>Visitas</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: COLORS.salesGreen }]}>{summary?.visitasCompletadas ?? 0}</Text>
          <Text style={styles.kpiLabel}>Completadas</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{summary?.visitasConVenta ?? 0}</Text>
          <Text style={styles.kpiLabel}>Con Venta</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{summary?.visitasPendientes ?? 0}</Text>
          <Text style={styles.kpiLabel}>Pendientes</Text>
        </View>
      </View>
      </Animated.View>

      {/* Breakdown */}
      <Animated.View entering={FadeInDown.duration(400).delay(300)}>
      <Card className="mx-4 mb-4">
        <Text style={styles.breakdownTitle}>Desglose</Text>
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>Visitas completadas</Text>
          <Text style={[styles.breakdownValue, { color: '#16a34a' }]}>{summary?.visitasCompletadas ?? 0}</Text>
        </View>
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>Con venta</Text>
          <Text style={[styles.breakdownValue, { color: '#d97706' }]}>{summary?.visitasConVenta ?? 0}</Text>
        </View>
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>Canceladas</Text>
          <Text style={[styles.breakdownValue, { color: '#ef4444' }]}>{summary?.visitasCanceladas ?? 0}</Text>
        </View>
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>Tasa de conversión</Text>
          <Text style={[styles.breakdownValue, { color: COLORS.primary }]}>
            {summary?.tasaConversion ? `${Math.round(summary.tasaConversion)}%` : '-'}
          </Text>
        </View>
      </Card>
      </Animated.View>

      {/* Route Summary */}
      {route && (
        <Animated.View entering={FadeInDown.duration(400).delay(400)}>
        <Card className="mx-4 mb-4">
          <Text style={styles.breakdownTitle}>Ruta: {route.nombre}</Text>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Paradas completadas</Text>
            <Text style={styles.breakdownValue}>{route.paradasCompletadas}/{route.totalParadas}</Text>
          </View>
          {route.kilometrosReales && (
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Kilómetros recorridos</Text>
              <Text style={styles.breakdownValue}>{route.kilometrosReales.toFixed(1)} km</Text>
            </View>
          )}
        </Card>
        </Animated.View>
      )}

      <View style={styles.actions}>
        <Button
          title="Volver al Inicio"
          onPress={() => router.replace('/(tabs)' as any)}
          fullWidth
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 32 },
  blueHeader: { backgroundColor: COLORS.headerBg, paddingHorizontal: 20, paddingBottom: 16, alignItems: 'center' },
  blueHeaderTitle: { fontSize: 20, fontWeight: '700', color: COLORS.headerText, textAlign: 'center' },
  effectivenessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    gap: 16,
    borderWidth: 1,
  },
  effectivenessContent: { flex: 1 },
  effectivenessLabel: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  effectivenessValue: { fontSize: 36, fontWeight: '800' },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    width: '47%',
    flexGrow: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiValue: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  kpiLabel: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  breakdownTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  breakdownLabel: { fontSize: 14, color: '#64748b' },
  breakdownValue: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  actions: { paddingHorizontal: 16 },
});
