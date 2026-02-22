import { View, Text, ScrollView, RefreshControl, Alert, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useRouteToday, useIniciarRuta } from '@/hooks';
import { Card, Button, LoadingSpinner, EmptyState } from '@/components/ui';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui';
import { MapPin, Clock, Play, Navigation, ChevronRight } from 'lucide-react-native';
import { formatTime } from '@/utils/format';
import { useState } from 'react';

const STOP_STATUS_COLORS: Record<number, string> = {
  0: '#6b7280', 1: '#f59e0b', 2: '#22c55e', 3: '#ef4444',
};
const STOP_STATUS_NAMES: Record<number, string> = {
  0: 'Pendiente', 1: 'En Progreso', 2: 'Completada', 3: 'Omitida',
};

export default function RutaScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const routeToday = useRouteToday();
  const iniciarRuta = useIniciarRuta();
  const route = routeToday.data;

  const onRefresh = async () => {
    setRefreshing(true);
    await routeToday.refetch();
    setRefreshing(false);
  };

  const handleIniciar = () => {
    if (!route) return;
    Alert.alert('Iniciar Ruta', '¿Estás listo para iniciar la ruta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Iniciar', onPress: () => iniciarRuta.mutate(route.id) },
    ]);
  };

  if (routeToday.isLoading) {
    return <View style={styles.container}><LoadingSpinner message="Cargando ruta..." /></View>;
  }

  if (!route) {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" colors={['#2563eb']} />}
      >
        <EmptyState icon={<Navigation size={48} color="#cbd5e1" />} title="Sin ruta para hoy" message="No tienes una ruta asignada para el día de hoy" />
      </ScrollView>
    );
  }

  const isPlanificada = route.estado === 0;
  const progress = route.totalParadas > 0 ? (route.paradasCompletadas / route.totalParadas) * 100 : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" colors={['#2563eb']} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header with Status */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerInfo}>
            <Text style={styles.routeName}>{route.nombre}</Text>
            {route.zonaNombre && (
              <View style={styles.zoneRow}>
                <MapPin size={12} color="#94a3b8" />
                <Text style={styles.zoneText}>{route.zonaNombre}</Text>
              </View>
            )}
          </View>
          <StatusBadge type="route" status={route.estado} />
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>{route.paradasCompletadas} de {route.totalParadas} completadas</Text>
            <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statPill, { backgroundColor: '#f0fdf4' }]}>
            <Text style={[styles.statValue, { color: '#16a34a' }]}>{route.paradasCompletadas}</Text>
            <Text style={styles.statLabel}>Hechas</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: '#fffbeb' }]}>
            <Text style={[styles.statValue, { color: '#d97706' }]}>{route.paradasPendientes}</Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: '#eff6ff' }]}>
            <Text style={[styles.statValue, { color: '#2563eb' }]}>{route.totalParadas}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {isPlanificada && (
          <Button title="Iniciar Ruta" onPress={handleIniciar} loading={iniciarRuta.isPending} fullWidth icon={<Play size={18} color="#ffffff" />} />
        )}
      </View>

      {/* Stops Timeline */}
      <View style={styles.stopsSection}>
        <Text style={styles.sectionTitle}>Paradas ({route.detalles?.length || 0})</Text>
        {route.detalles?.map((stop, index) => {
          const isCompleted = stop.estado === 2;
          const isActive = stop.estado === 1;
          const lineColor = isCompleted ? '#22c55e' : isActive ? '#f59e0b' : '#e2e8f0';

          return (
            <TouchableOpacity
              key={stop.id}
              style={styles.stopItem}
              onPress={() => router.push(`/(tabs)/ruta/parada/${stop.id}` as any)}
              activeOpacity={0.7}
            >
              <View style={styles.timeline}>
                <View style={[styles.timelineDot, {
                  backgroundColor: isCompleted ? '#22c55e' : isActive ? '#f59e0b' : '#e2e8f0',
                  borderColor: isCompleted ? '#22c55e' : isActive ? '#f59e0b' : '#cbd5e1',
                }]}>
                  <Text style={[styles.dotText, { color: isCompleted || isActive ? '#ffffff' : '#94a3b8' }]}>
                    {stop.ordenVisita}
                  </Text>
                </View>
                {index < (route.detalles?.length || 0) - 1 && (
                  <View style={[styles.timelineLine, { backgroundColor: lineColor }]} />
                )}
              </View>

              <View style={styles.stopCard}>
                <View style={styles.stopHeader}>
                  <Text style={styles.stopName} numberOfLines={1}>{stop.clienteNombre}</Text>
                  <ChevronRight size={16} color="#cbd5e1" />
                </View>
                <View style={styles.stopFooter}>
                  <Badge
                    label={STOP_STATUS_NAMES[stop.estado] || 'Desconocido'}
                    color={STOP_STATUS_COLORS[stop.estado] || '#6b7280'}
                    bgColor={`${STOP_STATUS_COLORS[stop.estado] || '#6b7280'}15`}
                  />
                  {stop.horaEstimadaLlegada && (
                    <View style={styles.timeRow}>
                      <Clock size={11} color="#94a3b8" />
                      <Text style={styles.timeText}>{formatTime(stop.horaEstimadaLlegada)}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 32 },
  header: { backgroundColor: '#ffffff', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerInfo: { flex: 1, marginRight: 12 },
  routeName: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  zoneText: { fontSize: 13, color: '#94a3b8' },
  progressSection: { gap: 6 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: '#e2e8f0', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: '#2563eb' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  progressPercent: { fontSize: 12, color: '#2563eb', fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statPill: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: '500', marginTop: 2 },
  stopsSection: { padding: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  stopItem: { flexDirection: 'row', marginBottom: 12 },
  timeline: { alignItems: 'center', width: 32 },
  timelineDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dotText: { fontSize: 11, fontWeight: '700' },
  timelineLine: { width: 2, flex: 1, marginVertical: 2 },
  stopCard: { flex: 1, marginLeft: 12, backgroundColor: '#ffffff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  stopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  stopName: { fontSize: 14, fontWeight: '600', color: '#1e293b', flex: 1, marginRight: 8 },
  stopFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeText: { fontSize: 11, color: '#94a3b8' },
});
