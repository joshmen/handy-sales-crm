import { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOfflineRutaHoy, useOfflineRutaDetalles, useClientNameMap } from '@/hooks';
import { LoadingSpinner, EmptyState } from '@/components/ui';
import { COLORS } from '@/theme/colors';
import { ChevronLeft, Navigation, Map } from 'lucide-react-native';
import { formatTime } from '@/utils/format';
import { performSync } from '@/sync/syncEngine';
import { database } from '@/db/database';
import { Q } from '@nozbe/watermelondb';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type RutaDetalle from '@/db/models/RutaDetalle';

const STOP_DOT_COLORS: Record<number, string> = {
  0: '#e2e8f0', // Pendiente — gray
  1: COLORS.headerBg, // En Progreso — blue
  2: '#22c55e', // Completada — green
  3: '#ef4444', // Omitida — red
};
const STOP_DOT_TEXT: Record<number, string> = {
  0: '#94a3b8', 1: '#ffffff', 2: '#ffffff', 3: '#ffffff',
};
const STOP_STATUS_NAMES: Record<number, string> = {
  0: 'Pendiente', 1: 'En Progreso', 2: 'Completada', 3: 'Omitida',
};
const STOP_STATUS_TEXT_COLORS: Record<number, string> = {
  0: '#94a3b8', // gray
  1: '#d97706', // amber
  2: '#16a34a', // green
  3: '#ef4444', // red
};

export default function RutaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: rutas, isLoading } = useOfflineRutaHoy();
  const route = rutas?.[0] ?? null;

  const { data: detalles } = useOfflineRutaDetalles(route?.id ?? '');
  const clientNames = useClientNameMap();

  // Direct query for stats on every focus (WDB observable unreliable in Expo Go/LokiJS)
  const [stats, setStats] = useState({ total: 0, atendidas: 0, pendientes: 0, omitidas: 0 });
  useFocusEffect(useCallback(() => {
    if (!route?.id) return;
    database.get<RutaDetalle>('ruta_detalles')
      .query(Q.where('ruta_id', route.id))
      .fetch()
      .then((stops) => {
        const total = stops.length;
        const visitadas = stops.filter((d) => d.estado === 2).length;
        const omitidas = stops.filter((d) => d.estado === 3).length;
        setStats({ total, atendidas: visitadas + omitidas, pendientes: total - visitadas - omitidas, omitidas });
      })
      .catch(() => {});
  }, [route?.id]));

  const progress = stats.total > 0 ? (stats.atendidas / stats.total) * 100 : 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await performSync();
    setRefreshing(false);
  };


  if (isLoading) {
    return <View style={styles.container}><LoadingSpinner message="Cargando ruta..." /></View>;
  }

  if (!route) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.navigate('/(tabs)' as any)} style={styles.backBtn}>
            <ChevronLeft size={22} color={COLORS.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ruta del Día</Text>
          <View style={{ width: 22 }} />
        </View>
        <ScrollView
          contentContainerStyle={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.button} colors={[COLORS.button]} />}
        >
          <EmptyState icon={<Navigation size={48} color="#cbd5e1" />} title="Sin ruta para hoy" message="No tienes una ruta asignada para el día de hoy" />
        </ScrollView>
      </View>
    );
  }


  return (
    <View style={styles.container}>
      {/* Blue Header — back + title + map icon */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.navigate('/(tabs)' as any)} style={styles.backBtn}>
          <ChevronLeft size={22} color={COLORS.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ruta del Día</Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/mapa?mode=route' as any)}
          style={styles.backBtn}
        >
          <Map size={22} color={COLORS.headerText} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.button} colors={[COLORS.button]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Section — white bg */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <View style={styles.progressSection}>
            <Text style={styles.routeName}>{route.nombre}</Text>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressLabel}>
              {stats.atendidas} de {stats.total} atendidas • {Math.round(progress)}%
            </Text>

            {/* Stat pills */}
            <View style={styles.pillsRow}>
              <View style={[styles.pill, { backgroundColor: '#f0fdf4' }]}>
                <Text style={[styles.pillText, { color: '#16a34a' }]}>{stats.atendidas} Hechas</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: '#fffbeb' }]}>
                <Text style={[styles.pillText, { color: '#d97706' }]}>{stats.pendientes} Pendientes</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: '#eff6ff' }]}>
                <Text style={[styles.pillText, { color: COLORS.headerBg }]}>{stats.total} Total</Text>
              </View>
            </View>

          </View>
        </Animated.View>

        {/* Stops — simple list with numbered dots */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <View style={styles.stopsSection}>
            {detalles?.map((stop: RutaDetalle) => {
              const dotBg = STOP_DOT_COLORS[stop.estado] ?? '#e2e8f0';
              const dotTextColor = STOP_DOT_TEXT[stop.estado] ?? '#94a3b8';
              const statusColor = STOP_STATUS_TEXT_COLORS[stop.estado] ?? '#94a3b8';
              const statusName = STOP_STATUS_NAMES[stop.estado] ?? 'Pendiente';
              const isPending = stop.estado === 0;
              const isInProgress = stop.estado === 1;

              return (
                <TouchableOpacity
                  key={stop.id}
                  style={styles.stopItem}
                  onPress={() => router.push(`/(tabs)/ruta/parada/${stop.id}` as any)}
                  activeOpacity={0.7}
                >
                  {/* Numbered dot */}
                  <View style={[
                    styles.stopDot,
                    { backgroundColor: dotBg },
                    isInProgress && styles.stopDotActive,
                  ]}>
                    <Text style={[styles.stopDotText, { color: dotTextColor }]}>{stop.orden}</Text>
                  </View>

                  {/* Name + status */}
                  <View style={styles.stopInfo}>
                    <Text
                      style={[styles.stopName, isPending && { color: COLORS.textSecondary }]}
                      numberOfLines={1}
                    >
                      {clientNames.get(stop.clienteId) || 'Cliente'}
                    </Text>
                    <Text style={[styles.stopStatus, { color: statusColor }]}>
                      {statusName}
                      {stop.horaLlegada ? ` • ${formatTime(stop.horaLlegada)}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    backgroundColor: COLORS.headerBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.headerText },

  scrollContent: { paddingBottom: 32 },

  // Progress section — white background
  progressSection: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  routeName: { fontSize: 16, fontWeight: '700', color: COLORS.foreground },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: '#e2e8f0', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: COLORS.headerBg },
  progressLabel: { fontSize: 12, color: COLORS.textSecondary },
  pillsRow: { flexDirection: 'row', gap: 8 },
  pill: { borderRadius: 10, paddingVertical: 4, paddingHorizontal: 12 },
  pillText: { fontSize: 11, fontWeight: '600' },

  // Stops
  stopsSection: { paddingHorizontal: 20, paddingTop: 12 },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  stopDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopDotActive: {
    borderWidth: 3,
    borderColor: '#93c5fd',
  },
  stopDotText: { fontSize: 11, fontWeight: '700' },
  stopInfo: { flex: 1, gap: 2 },
  stopName: { fontSize: 14, fontWeight: '600', color: COLORS.foreground },
  stopStatus: { fontSize: 11 },
});
