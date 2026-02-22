import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useVisitsSummary, useRouteToday } from '@/hooks';
import { Card, Button, LoadingSpinner } from '@/components/ui';
import { Trophy, Users, ShoppingBag, Clock, CheckCircle } from 'lucide-react-native';

export default function ResumenDiarioScreen() {
  const router = useRouter();
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
      {/* Effectiveness Banner */}
      <View style={[styles.effectivenessBanner, { backgroundColor: `${efectividadColor}10`, borderColor: `${efectividadColor}30` }]}>
        <Trophy size={28} color={efectividadColor} />
        <View style={styles.effectivenessContent}>
          <Text style={styles.effectivenessLabel}>Efectividad del Día</Text>
          <Text style={[styles.effectivenessValue, { color: efectividadColor }]}>{efectividad}%</Text>
        </View>
      </View>

      {/* KPI Grid */}
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, { backgroundColor: '#eff6ff' }]}>
          <Users size={22} color="#2563eb" />
          <Text style={styles.kpiValue}>{summary?.totalVisitas ?? 0}</Text>
          <Text style={styles.kpiLabel}>Visitas</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: '#f0fdf4' }]}>
          <CheckCircle size={22} color="#16a34a" />
          <Text style={styles.kpiValue}>{summary?.visitasCompletadas ?? 0}</Text>
          <Text style={styles.kpiLabel}>Completadas</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: '#fef3c7' }]}>
          <ShoppingBag size={22} color="#d97706" />
          <Text style={styles.kpiValue}>{summary?.visitasConVenta ?? 0}</Text>
          <Text style={styles.kpiLabel}>Con Venta</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: '#fef2f2' }]}>
          <Clock size={22} color="#ef4444" />
          <Text style={styles.kpiValue}>{summary?.visitasPendientes ?? 0}</Text>
          <Text style={styles.kpiLabel}>Pendientes</Text>
        </View>
      </View>

      {/* Breakdown */}
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
          <Text style={[styles.breakdownValue, { color: '#2563eb' }]}>
            {summary?.tasaConversion ? `${Math.round(summary.tasaConversion)}%` : '-'}
          </Text>
        </View>
      </Card>

      {/* Route Summary */}
      {route && (
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 32 },
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
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 6,
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
